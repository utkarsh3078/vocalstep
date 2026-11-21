import { practice } from "@/config/practice";

import { parseSpeech } from "./blocks";

/**
 * Checks for a speech edited by hand on the Edit page. Pure, so the browser
 * (live word count) and the server action (the real check) agree.
 */

const { edit: rules } = practice;

/**
 * Tidies edited text: Unix line ends, no control characters except tabs and
 * line breaks, no trailing spaces, at most one blank line in a row.
 */
export function normaliseContent(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A title on one line with single spaces; empty means "use the topic". */
export function normaliseTitle(raw: string): string {
  return raw.normalize("NFC").replace(/\p{Cc}+/gu, " ").replace(/\s+/gu, " ").trim();
}

export type EditProblem = "too_short" | "too_long" | "title_too_long";

export interface CheckedEdit {
  title: string | null;
  content: string;
  wordCount: number;
}

/** The cleaned edit, or what is wrong with it. */
export function checkEdit(
  rawTitle: string,
  rawContent: string,
): { ok: true; edit: CheckedEdit } | { ok: false; problem: EditProblem } {
  const title = normaliseTitle(rawTitle);
  if (title.length > rules.maxTitleLength) return { ok: false, problem: "title_too_long" };

  const content = normaliseContent(rawContent);
  if (content.length > rules.maxCharacters) return { ok: false, problem: "too_long" };

  const { wordCount } = parseSpeech(content);
  if (wordCount < rules.minWords) return { ok: false, problem: "too_short" };

  return { ok: true, edit: { title: title || null, content, wordCount } };
}

/** What the Edit page says about a problem. */
export function editProblemMessage(problem: EditProblem): string {
  switch (problem) {
    case "too_short":
      return `A speech needs at least ${rules.minWords} words to practise. Headings don't count.`;
    case "too_long":
      return `This speech is too long to save. Keep it under ${rules.maxCharacters.toLocaleString("en-IN")} characters.`;
    case "title_too_long":
      return `Keep the title under ${rules.maxTitleLength} characters.`;
  }
}
