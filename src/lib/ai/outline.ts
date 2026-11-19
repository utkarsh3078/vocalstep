import { z } from "zod";

import { practice, type RefusalReason } from "@/config/practice";
import { splitTarget } from "@/lib/speech/targets";

import type { OutlineSection, RawOutline } from "./types";

const REASONS = Object.keys(practice.refusalReasons) as [RefusalReason, ...RefusalReason[]];

/**
 * The outline reply, as a JSON schema for the model's structured output.
 * The model also returns its topic check here, so refusing a topic costs no
 * extra request. Word targets are not asked for: the app sets them.
 */
export const outlineJsonSchema = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["ok", "rejected"],
      description: "rejected if the topic breaks the rules or is not a real topic to speak about",
    },
    reason: {
      type: "string",
      enum: [...REASONS, "none"],
      description: "why the topic was rejected, or none",
    },
    title: { type: "string", description: "a short, plain title for the speech" },
    sections: {
      type: "array",
      description: "the sections in speaking order; empty when rejected",
      items: {
        type: "object",
        properties: {
          heading: { type: "string", description: "a short heading of a few words" },
          goal: { type: "string", description: "one sentence: what this section covers" },
        },
        required: ["heading", "goal"],
      },
    },
  },
  required: ["verdict", "reason", "title", "sections"],
} as const;

/** The same shape, for checking the reply. Lenient on lengths; trimmed below. */
export const rawOutlineSchema = z.object({
  verdict: z.enum(["ok", "rejected"]),
  reason: z.enum([...REASONS, "none"]).catch("none"),
  title: z.string().catch(""),
  sections: z
    .array(z.object({ heading: z.string(), goal: z.string().catch("") }))
    .catch([]),
}) satisfies z.ZodType<RawOutline>;

export type CheckedOutline =
  | { kind: "ok"; title: string; sections: OutlineSection[] }
  | { kind: "refused"; reason: RefusalReason }
  | { kind: "invalid" };

/** Strips markdown and numbering a model may add: "## 1. Opening" becomes "Opening". */
function cleanHeading(text: string): string {
  return text
    .replace(/[#*_`]/g, "")
    .replace(/^\s*(?:section|part)\s*\d+\s*[:.)-]\s*/i, "")
    .replace(/^\s*\d+\s*[:.)-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
}

/**
 * Turns the model's outline into the one the app uses: at most `sectionCount`
 * sections with clean headings, and word targets that add up to `totalWords`.
 */
export function checkOutline(
  raw: RawOutline,
  { sectionCount, totalWords, topic }: { sectionCount: number; totalWords: number; topic: string },
): CheckedOutline {
  if (raw.verdict === "rejected") {
    return { kind: "refused", reason: raw.reason === "none" ? "not_a_topic" : raw.reason };
  }

  const sections = raw.sections
    .map((section) => ({
      heading: cleanHeading(section.heading),
      goal: section.goal.replace(/\s+/g, " ").trim().slice(0, 240),
    }))
    .filter((section) => section.heading !== "")
    .slice(0, sectionCount);

  if (sections.length === 0) return { kind: "invalid" };

  const targets = splitTarget(totalWords, sections.length);
  const title = cleanHeading(raw.title).slice(0, 120) || topic.slice(0, 120);

  return {
    kind: "ok",
    title,
    sections: sections.map((section, index) => ({ ...section, words: targets[index] })),
  };
}
