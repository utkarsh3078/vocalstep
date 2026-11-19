import type { Difficulty, LanguageCode, RefusalReason } from "@/config/practice";

/** What every request in one speech shares. */
export interface SpeechSettings {
  /** The user's topic, already cleaned. Treated as data, never as instructions. */
  topic: string;
  language: LanguageCode;
  difficulty: Difficulty;
  minutes: number;
}

export interface OutlineRequest extends SpeechSettings {
  /** Total spoken words wanted. */
  totalWords: number;
  /** How many sections to plan. */
  sectionCount: number;
}

/** The outline as the model returns it, before checking. */
export interface RawOutline {
  verdict: "ok" | "rejected";
  reason: RefusalReason | "none";
  title: string;
  sections: { heading: string; goal: string }[];
}

/** A checked outline section, with the word target set by the app. */
export interface OutlineSection {
  heading: string;
  goal: string;
  words: number;
}

export interface SectionRequest extends SpeechSettings {
  title: string;
  outline: OutlineSection[];
  /** Which section to write, from 0. */
  index: number;
  /** Earlier sections, for continuity: headings plus the end of the previous one. */
  earlier: { heading: string; text: string }[];
}

export interface ExtendRequest extends SectionRequest {
  /** The section as written so far. */
  existingText: string;
  /** Roughly how many words to add. */
  missingWords: number;
}

export interface TokenUsage {
  input: number;
  output: number;
}

export type StreamChunk =
  | { type: "text"; text: string }
  | { type: "usage"; usage: TokenUsage };

/**
 * The AI calls behind one small interface, so the provider can change.
 * Implementations must not retry on their own beyond what is documented.
 */
export interface SpeechWriter {
  /** Provider name and model, saved on the speech. */
  readonly model: string;
  outline(request: OutlineRequest): Promise<{ outline: RawOutline; usage: TokenUsage }>;
  section(request: SectionRequest): AsyncIterable<StreamChunk>;
  extend(request: ExtendRequest): AsyncIterable<StreamChunk>;
}

/**
 * Why an AI call failed:
 * - `blocked`: the provider's safety filter stopped it.
 * - `rate_limited`: the provider is over its quota, even after one retry.
 * - `invalid_output`: the reply was unusable (bad JSON, empty text).
 * - `failed`: anything else (network, timeout, server error).
 */
export type AIErrorKind = "blocked" | "rate_limited" | "invalid_output" | "failed";

export class AIError extends Error {
  constructor(
    readonly kind: AIErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIError";
  }
}
