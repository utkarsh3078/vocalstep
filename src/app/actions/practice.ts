"use server";

import { z } from "zod";

import { samples } from "@/content/samples";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { practiceTargetSchema, type PracticeTarget } from "@/lib/practice/target";
import { createClient } from "@/lib/supabase/server";

export type StartPracticeResult = { sessionId: string } | { error: "unauthorized" | "failed" };

const timezoneSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_+\-/]+$/);

/**
 * Starts a practice session for the signed-in user, when they press Start in
 * the teleprompter. Any unfinished session on the same speech or sample is
 * closed. The browser's time zone is saved too, so practice counts toward the
 * day on the user's own clock.
 */
export async function startPracticeSession(
  target: PracticeTarget,
  timezone: string | null,
): Promise<StartPracticeResult> {
  const parsed = practiceTargetSchema.safeParse(target);
  if (!parsed.success) return { error: "failed" };
  const sampleSlug = "sampleSlug" in parsed.data ? parsed.data.sampleSlug : null;
  if (sampleSlug && !samples.some(({ slug }) => slug === sampleSlug)) return { error: "failed" };
  if (!isSupabaseConfigured()) return { error: "unauthorized" };

  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" };

  const zone = timezoneSchema.safeParse(timezone);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_practice_session", {
    ...("speechId" in parsed.data
      ? { target_speech: parsed.data.speechId }
      : { target_sample: parsed.data.sampleSlug }),
    ...(zone.success ? { user_timezone: zone.data } : {}),
  });
  if (error || !data) {
    console.error("Could not start a practice session:", error?.code, error?.message);
    return { error: "failed" };
  }
  return { sessionId: data };
}
