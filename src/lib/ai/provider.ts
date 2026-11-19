import "server-only";

import { getAiEnv } from "@/lib/env/server";

import { createGeminiWriter } from "./gemini";
import { createMockWriter } from "./mock";
import type { SpeechWriter } from "./types";

/**
 * The writer chosen by AI_PROVIDER, or null when generation is not set up.
 * A new writer per speech; the Gemini client is only created in gemini mode.
 */
export function getSpeechWriter(): SpeechWriter | null {
  const env = getAiEnv();
  if (!env) return null;
  if (env.AI_PROVIDER === "gemini") {
    return createGeminiWriter({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL });
  }
  return createMockWriter({ delayMs: env.MOCK_AI_DELAY_MS });
}
