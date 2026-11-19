import { practice, type LanguageCode, type RefusalReason } from "@/config/practice";
import { countWords } from "@/lib/speech/words";

/**
 * Guardrails in code: the checks before an AI request (layer 1 in PLAN.md)
 * and on its output (layer 5). Pure functions, so they are unit-tested.
 */

/** Tidies a topic typed by a user: no control characters, single spaces. */
export function cleanTopic(raw: string): string {
  return raw
    .normalize("NFC")
    // Control characters only: format characters such as the zero-width
    // joiner are part of correct Devanagari spelling.
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One pattern for the whole blocked list, matching whole words in any script. */
const BLOCKED = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${practice.topic.blockedTerms.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}])`,
  "iu",
);

/**
 * Refuses an obviously unsuitable topic before spending an AI request.
 * Everything else goes on to the AI's own topic check.
 */
export function screenTopic(topic: string): { ok: true } | { ok: false; reason: RefusalReason } {
  // Invisible characters could split a blocked word, so ignore them here.
  const visible = topic.replace(/\p{Cf}/gu, "");
  return BLOCKED.test(visible) ? { ok: false, reason: "unsuitable" } : { ok: true };
}

/**
 * Removes harmless formatting the AI was asked not to use: heading lines (the
 * app adds its own), bold and italic markers, and extra blank lines.
 */
export function tidySectionText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !/^\s{0,3}#{1,6}\s/.test(line))
    .join("\n")
    // A script read aloud never needs an asterisk; "__" is markdown bold.
    .replace(/\*|__/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Problems that make a section unusable, so it is written again. */
export type OutputProblem = "empty" | "list" | "meta" | "link" | "wrong_script";

const LIST_LINE = /^\s*(?:[-*+•]|\d+[.)])\s+/;
const META_PHRASES = [
  /\bas an ai\b/i,
  /\blanguage model\b/i,
  /\bhere(?:'s| is) (?:your|a|the) (?:speech|script)\b/i,
  /\bword count\b/i,
  /\bi hope this (?:helps|speech)\b/i,
  /\bsystem instructions?\b/i,
  /\bstage direction/i,
  /\[(?:pause|applause|smile|laughs?)\]/i,
];

function letterShare(text: string, script: RegExp): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return 0;
  return letters.filter((letter) => script.test(letter)).length / letters.length;
}

/** Checks a tidied section. An empty list means the section can be used. */
export function findOutputProblems(text: string, language: LanguageCode): OutputProblem[] {
  const problems: OutputProblem[] = [];
  if (countWords(text) === 0) return ["empty"];

  const lines = text.split("\n");
  if (lines.filter((line) => LIST_LINE.test(line)).length >= 2) problems.push("list");
  if (META_PHRASES.some((phrase) => phrase.test(text))) problems.push("meta");
  if (/https?:\/\/|www\.|\]\(/i.test(text)) problems.push("link");

  const share =
    language === "hi"
      ? letterShare(text, /\p{Script=Devanagari}/u)
      : letterShare(text, /\p{Script=Latin}/u);
  if (share < (language === "hi" ? 0.6 : 0.9)) problems.push("wrong_script");

  return problems;
}
