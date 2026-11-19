/**
 * Model-specific request settings, kept in one place.
 *
 * Thinking is set to the lowest level each model accepts: speech writing does
 * not need it, and thinking costs time and output tokens. Gemini 2.5 models
 * take a token budget; Gemini 3.x models take a named level. A model not
 * listed here gets no thinking setting at all (the model's own default), which
 * is always accepted.
 *
 * Checked against Google's model pages on 2026-11-15. Add a rule when you
 * switch GEMINI_MODEL to a model this list does not cover.
 */
export type ThinkingSetting =
  | { kind: "level"; level: "MINIMAL" | "LOW" }
  | { kind: "budget"; tokens: number }
  | { kind: "default" };

/** First matching rule wins, so specific names come before families. */
const RULES: { pattern: RegExp; thinking: ThinkingSetting }[] = [
  { pattern: /^gemini-3\.8-flash(?!-lite)/, thinking: { kind: "level", level: "LOW" } },
  { pattern: /^gemini-3(\.\d+)?-flash-lite/, thinking: { kind: "level", level: "MINIMAL" } },
  { pattern: /^gemini-3(\.\d+)?-flash/, thinking: { kind: "level", level: "MINIMAL" } },
  { pattern: /^gemini-3(\.\d+)?-pro/, thinking: { kind: "level", level: "LOW" } },
  { pattern: /^gemini-2\.5-pro/, thinking: { kind: "budget", tokens: 128 } },
  { pattern: /^gemini-2\.5-flash/, thinking: { kind: "budget", tokens: 0 } },
];

export function thinkingFor(model: string): ThinkingSetting {
  const name = model.trim().toLowerCase().replace(/^models\//, "");
  return RULES.find((rule) => rule.pattern.test(name))?.thinking ?? { kind: "default" };
}
