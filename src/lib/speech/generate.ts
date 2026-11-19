import { practice, type RefusalReason } from "@/config/practice";
import { findOutputProblems, tidySectionText } from "@/lib/ai/guardrails";
import { checkOutline } from "@/lib/ai/outline";
import {
  AIError,
  type OutlineSection,
  type SectionRequest,
  type SpeechSettings,
  type SpeechWriter,
  type TokenUsage,
} from "@/lib/ai/types";

import { parseSpeech } from "./blocks";
import { isTooShort, sectionTargets, wordTarget } from "./targets";
import { countWords } from "./words";

/**
 * Writes one speech with any SpeechWriter, as a series of events. Knows
 * nothing about HTTP or the database; the route handler does that.
 *
 * 1. Outline, with the topic check folded in (one request).
 * 2. Each section streamed in turn, given the outline and the end of the
 *    previous section. Each is tidied and checked; a section that fails the
 *    checks is written once more, and a second failure stops the speech.
 * 3. The first section that comes back more than ~15% short is extended once.
 *    That is the only extension per speech, to keep requests low.
 */
export type PipelineEvent =
  | { type: "outline"; title: string; sections: OutlineSection[] }
  | { type: "section"; index: number; heading: string }
  | { type: "delta"; index: number; text: string }
  | { type: "section_text"; index: number; text: string }
  | { type: "complete"; content: string; wordCount: number; usage: TokenUsage }
  | {
      type: "failed";
      code: "refused" | "blocked" | "busy" | "failed";
      reason?: RefusalReason;
      usage: TokenUsage;
    };

function failureCode(error: unknown): "blocked" | "busy" | "failed" {
  if (error instanceof AIError) {
    if (error.kind === "blocked") return "blocked";
    if (error.kind === "rate_limited") return "busy";
  }
  return "failed";
}

export async function* generateSpeech(
  writer: SpeechWriter,
  settings: SpeechSettings,
): AsyncGenerator<PipelineEvent> {
  const usage: TokenUsage = { input: 0, output: 0 };
  const addUsage = (more: TokenUsage) => {
    usage.input += more.input;
    usage.output += more.output;
  };

  const { wpm } = practice.languages[settings.language];
  const totalWords = wordTarget(settings.minutes, wpm);
  const sectionCount = sectionTargets(totalWords, practice.generation.sectionWords).length;

  try {
    const { outline: raw, usage: outlineUsage } = await writer.outline({ ...settings, totalWords, sectionCount });
    addUsage(outlineUsage);

    const outline = checkOutline(raw, { sectionCount, totalWords, topic: settings.topic });
    if (outline.kind === "refused") {
      yield { type: "failed", code: "refused", reason: outline.reason, usage };
      return;
    }
    if (outline.kind === "invalid") {
      yield { type: "failed", code: "failed", usage };
      return;
    }

    const { title, sections } = outline;
    yield { type: "outline", title, sections };

    const written: { heading: string; text: string }[] = [];
    let extensionUsed = false;

    for (const [index, section] of sections.entries()) {
      const request: SectionRequest = { ...settings, title, outline: sections, index, earlier: written };
      yield { type: "section", index, heading: section.heading };

      // Write the section, and once more if it fails the checks.
      let text: string | null = null;
      for (let attempt = 0; attempt < 2 && text === null; attempt += 1) {
        if (attempt > 0) yield { type: "section_text", index, text: "" };

        let raw = "";
        for await (const chunk of writer.section(request)) {
          if (chunk.type === "usage") {
            addUsage(chunk.usage);
          } else {
            raw += chunk.text;
            yield { type: "delta", index, text: chunk.text };
          }
        }

        const tidied = tidySectionText(raw);
        if (findOutputProblems(tidied, settings.language).length === 0) text = tidied;
      }

      if (text === null) {
        yield { type: "failed", code: "failed", usage };
        return;
      }

      // Extend one short section per speech. If the extension fails or fails
      // the checks, the section is kept as it was.
      const words = countWords(text);
      if (!extensionUsed && isTooShort(words, section.words, practice.generation.shortSectionThreshold)) {
        extensionUsed = true;
        try {
          let extra = "";
          yield { type: "delta", index, text: "\n\n" };
          const extendRequest = { ...request, existingText: text, missingWords: section.words - words };
          for await (const chunk of writer.extend(extendRequest)) {
            if (chunk.type === "usage") {
              addUsage(chunk.usage);
            } else {
              extra += chunk.text;
              yield { type: "delta", index, text: chunk.text };
            }
          }
          const tidied = tidySectionText(extra);
          if (tidied && findOutputProblems(tidied, settings.language).length === 0) {
            text = `${text}\n\n${tidied}`;
          }
        } catch (error) {
          // A blocked extension is a warning about the topic: stop the speech.
          if (failureCode(error) === "blocked") throw error;
        }
      }

      yield { type: "section_text", index, text };
      written.push({ heading: section.heading, text });
    }

    const content = written.map((section) => `## ${section.heading}\n\n${section.text}`).join("\n\n");
    yield { type: "complete", content, wordCount: parseSpeech(content).wordCount, usage };
  } catch (error) {
    yield { type: "failed", code: failureCode(error), usage };
  }
}
