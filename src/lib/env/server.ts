import "server-only";

import { z } from "zod";

/**
 * Server-only environment variables. Never import this from browser code.
 *
 * Read lazily, on first use, so the app builds before any keys exist. Speech
 * generation stays switched off until AI_PROVIDER is set: a missing value must
 * never quietly fall back to the mock writer in production.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const serverEnvSchema = z.discriminatedUnion("AI_PROVIDER", [
  z.object({
    AI_PROVIDER: z.literal("gemini"),
    GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required for the gemini provider"),
    GEMINI_MODEL: z.string().trim().min(1).default(DEFAULT_GEMINI_MODEL),
  }),
  z.object({
    AI_PROVIDER: z.literal("mock"),
    /** Delay between streamed chunks, to mimic a real model. */
    MOCK_AI_DELAY_MS: z.coerce.number().int().min(0).max(1000).default(15),
  }),
]);

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function read() {
  // Empty values count as unset, so `GEMINI_MODEL=` falls back to the default.
  const value = (name: string) => process.env[name]?.trim() || undefined;
  return serverEnvSchema.safeParse({
    AI_PROVIDER: value("AI_PROVIDER"),
    GEMINI_API_KEY: value("GEMINI_API_KEY"),
    GEMINI_MODEL: value("GEMINI_MODEL"),
    MOCK_AI_DELAY_MS: value("MOCK_AI_DELAY_MS"),
  });
}

/** The validated AI settings, or null when generation is not set up. */
export function getAiEnv(): ServerEnv | null {
  const result = read();
  return result.success ? result.data : null;
}
