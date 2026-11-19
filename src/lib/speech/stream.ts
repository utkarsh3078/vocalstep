import type { RefusalReason } from "@/config/practice";
import type { OutlineSection } from "@/lib/ai/types";

/**
 * The generation stream: newline-delimited JSON, one event per line.
 * Shared by the route handler (writing) and the Create page (reading).
 *
 *   meta          the speech exists: id, title and outline
 *   section       a section starts
 *   delta         streamed text for the current section, as it arrives
 *   section_text  the final, cleaned text of a section; replaces its deltas
 *                 (an empty text clears the section before it is rewritten)
 *   done          the speech is saved and ready
 *   error         generation stopped; see GenerationErrorCode
 */
export type GenerationEvent =
  | { type: "meta"; speechId: string; title: string; outline: OutlineSection[] }
  | { type: "section"; index: number; heading: string }
  | { type: "delta"; index: number; text: string }
  | { type: "section_text"; index: number; text: string }
  | { type: "done"; speechId: string; wordCount: number }
  | { type: "error"; code: GenerationErrorCode; reason?: RefusalReason };

/**
 * Why generation stopped:
 * - refused: the topic is not allowed (`reason` says why); no free speech used
 * - blocked: the AI's safety filter stopped it; no free speech used
 * - busy: the AI is over its rate limit, or the site's daily cap is reached
 * - failed: anything else; no free speech used
 * - free_used: the account has used its free speeches
 * - daily_limit: too many attempts in 24 hours
 * - unavailable: generation is not set up on this server
 * - invalid: the request itself was not valid
 * - unauthorized: not signed in
 */
export type GenerationErrorCode =
  | "refused"
  | "blocked"
  | "busy"
  | "failed"
  | "free_used"
  | "daily_limit"
  | "unavailable"
  | "invalid"
  | "unauthorized";

export function encodeEvent(event: GenerationEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/**
 * Splits received text into complete events. Returns the events and any
 * unfinished last line, to be prefixed to the next chunk. Unreadable lines are
 * skipped.
 */
export function decodeEvents(buffer: string): { events: GenerationEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: GenerationEvent[] = [];

  for (const line of lines) {
    if (line.trim() === "") continue;
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value === "object" && value !== null && "type" in value) {
        events.push(value as GenerationEvent);
      }
    } catch {
      // A broken line is skipped; the final "done" or "error" still arrives.
    }
  }

  return { events, rest };
}

/** The speech as received so far. */
export interface StreamedSpeech {
  speechId?: string;
  title?: string;
  sections: { heading: string; text: string }[];
}

/** Applies one event to the speech received so far. Returns a new object. */
export function applyEvent(speech: StreamedSpeech, event: GenerationEvent): StreamedSpeech {
  switch (event.type) {
    case "meta":
      return { ...speech, speechId: event.speechId, title: event.title };
    case "section": {
      const sections = [...speech.sections];
      sections[event.index] = { heading: event.heading, text: "" };
      return { ...speech, sections };
    }
    case "delta":
    case "section_text": {
      const current = speech.sections[event.index];
      if (!current) return speech;
      const sections = [...speech.sections];
      sections[event.index] = {
        ...current,
        text: event.type === "delta" ? current.text + event.text : event.text,
      };
      return { ...speech, sections };
    }
    default:
      return speech;
  }
}

/** The speech so far as markdown, for the shared speech parser. */
export function toMarkdown(speech: StreamedSpeech): string {
  return speech.sections
    .filter(Boolean)
    .map((section) => `## ${section.heading}\n\n${section.text}`)
    .join("\n\n");
}
