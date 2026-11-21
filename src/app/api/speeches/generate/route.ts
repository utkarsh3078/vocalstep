import { type NextRequest } from "next/server";
import { z } from "zod";

import {
  isOfferedLanguage,
  offeredLanguages,
  practice,
  type Difficulty,
  type LanguageCode,
  type RefusalReason,
} from "@/config/practice";
import { cleanTopic, screenTopic } from "@/lib/ai/guardrails";
import { getSpeechWriter } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { getQuotaCounts, getSpeech, retireIfUnpractised } from "@/lib/speech/data";
import { generateSpeech } from "@/lib/speech/generate";
import { checkQuota } from "@/lib/speech/quota";
import { encodeEvent, type GenerationErrorCode, type GenerationEvent } from "@/lib/speech/stream";
import { createClient } from "@/lib/supabase/server";

/**
 * Writes a new speech and streams it back as newline-delimited JSON events
 * (see src/lib/speech/stream.ts).
 *
 * A 15-minute speech takes 6 AI requests, so this route may run for a minute or
 * two. Vercel's Hobby plan allows up to 300 seconds with Fluid compute.
 */
export const maxDuration = 300;

/** New speeches only in offered languages (a speech in another still displays). */
const languages = offeredLanguages as [LanguageCode, ...LanguageCode[]];
const difficulties = Object.keys(practice.difficulties) as [Difficulty, ...Difficulty[]];

const durationSchema = z.number().refine((value) => (practice.durations as readonly number[]).includes(value));

/**
 * A new speech from the Create form, or `replaces`: write one of the user's
 * speeches again with its own settings (Regenerate), which come from the
 * database, not the request.
 */
const requestSchema = z.union([
  z.strictObject({
    topic: z.string().max(practice.topic.maxLength * 4),
    minutes: durationSchema,
    language: z.enum(languages),
    difficulty: z.enum(difficulties),
  }),
  z.strictObject({ replaces: z.uuid() }),
]);

/** Faults in the request or on the server keep an error status. */
const FAULT_STATUS: Partial<Record<GenerationErrorCode, number>> = {
  invalid: 400,
  unauthorized: 401,
  failed: 500,
};

/**
 * Ends the request before any writing starts. Expected outcomes (a refused
 * topic, a used-up quota, a busy service) are answered with status 200 and the
 * same one-line error event the stream uses, so the browser does not log them
 * as failed requests; real faults keep an error status.
 */
function errorResponse(code: GenerationErrorCode, reason?: RefusalReason): Response {
  const event: GenerationEvent = { type: "error", code, ...(reason ? { reason } : {}) };
  const status = FAULT_STATUS[code];
  if (status) return Response.json(event, { status, headers: { "Cache-Control": "no-store" } });

  return new Response(encodeEvent(event), {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Maps the database's limit errors (raised by the speeches_enforce_limits trigger). */
function limitCode(hint: string | undefined): GenerationErrorCode {
  return hint === "free_used" || hint === "daily_limit" || hint === "busy" ? hint : "failed";
}

export async function POST(request: NextRequest) {
  const writer = getSpeechWriter();
  if (!writer || !isSupabaseConfigured()) return errorResponse("unavailable");

  // The user always comes from the verified session, never from the request body.
  const user = await getCurrentUser();
  if (!user) return errorResponse("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid");
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return errorResponse("invalid");

  const supabase = await createClient();

  // Regenerate: the same settings as the speech being replaced.
  let settings: { topic: string; minutes: number; language: LanguageCode; difficulty: Difficulty };
  let replaces: string | null = null;
  if ("replaces" in parsed.data) {
    const old = await getSpeech(supabase, parsed.data.replaces);
    if (!old || old.status !== "ready") return errorResponse("invalid");
    const difficulty = old.difficulty as Difficulty;
    if (
      !durationSchema.safeParse(old.targetMinutes).success ||
      !Object.hasOwn(practice.difficulties, difficulty) ||
      !isOfferedLanguage(old.language)
    ) {
      return errorResponse("invalid");
    }
    settings = { topic: old.topic, minutes: old.targetMinutes, language: old.language, difficulty };
    replaces = old.id;
  } else {
    settings = parsed.data;
  }

  const topic = cleanTopic(settings.topic);
  if (topic.length < practice.topic.minLength || topic.length > practice.topic.maxLength) {
    return errorResponse("invalid");
  }

  // Obvious refusals cost no AI request and no attempt.
  const screened = screenTopic(topic);
  if (!screened.ok) return errorResponse("refused", screened.reason);

  const counts = await getQuotaCounts(supabase);
  if (!counts) return errorResponse("failed");
  const quota = checkQuota(counts);
  if (!quota.ok) return errorResponse(quota.code);

  const { language, difficulty, minutes } = settings;
  const { data: speech, error: insertError } = await supabase
    .from("speeches")
    .insert({ topic, target_minutes: minutes, language, difficulty, model: writer.model })
    .select("id")
    .single();
  if (insertError || !speech) return errorResponse(limitCode(insertError?.hint));

  // Remember the choices for next time. Not important enough to fail over.
  await supabase
    .from("profiles")
    .update({ last_language: language, last_difficulty: difficulty })
    .eq("id", user.id);

  const speechId = speech.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: GenerationEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The browser went away. Keep writing so the speech is still saved.
          open = false;
        }
      };
      const markFailed = (usage = { input: 0, output: 0 }) =>
        supabase
          .from("speeches")
          .update({ status: "failed", tokens_in: usage.input, tokens_out: usage.output })
          .eq("id", speechId);

      try {
        for await (const event of generateSpeech(writer, { topic, language, difficulty, minutes })) {
          switch (event.type) {
            case "outline":
              await supabase.from("speeches").update({ title: event.title }).eq("id", speechId);
              send({ type: "meta", speechId, title: event.title, outline: event.sections });
              break;
            case "section":
            case "delta":
            case "section_text":
              send(event);
              break;
            case "complete": {
              const { error } = await supabase
                .from("speeches")
                .update({
                  status: "ready",
                  content: event.content,
                  word_count: event.wordCount,
                  tokens_in: event.usage.input,
                  tokens_out: event.usage.output,
                })
                .eq("id", speechId);
              if (error) {
                await markFailed(event.usage);
                send({ type: "error", code: "failed" });
              } else if (replaces) {
                const replaced = await retireIfUnpractised(supabase, replaces);
                send({ type: "done", speechId, wordCount: event.wordCount, replaced });
              } else {
                send({ type: "done", speechId, wordCount: event.wordCount });
              }
              break;
            }
            case "failed":
              await markFailed(event.usage);
              send({ type: "error", code: event.code, ...(event.reason ? { reason: event.reason } : {}) });
              break;
          }
        }
      } catch (error) {
        console.error("Speech generation stopped unexpectedly", error);
        await markFailed();
        send({ type: "error", code: "failed" });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Stops proxies from holding the stream back until it ends.
      "X-Accel-Buffering": "no",
    },
  });
}
