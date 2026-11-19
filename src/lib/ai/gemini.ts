import "server-only";

import {
  ApiError,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  ThinkingLevel,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type ThinkingConfig,
} from "@google/genai";

import { practice } from "@/config/practice";

import { isBlockingFinish, isRetryableRateLimit, retryDelaySeconds } from "./errors";
import { thinkingFor } from "./models";
import { outlineJsonSchema, rawOutlineSchema } from "./outline";
import { extendPrompt, outlinePrompt, sectionPrompt, systemInstruction } from "./prompts";
import {
  AIError,
  type ExtendRequest,
  type SectionRequest,
  type SpeechSettings,
  type SpeechWriter,
  type StreamChunk,
  type TokenUsage,
} from "./types";

/**
 * The Gemini adapter, using @google/genai.
 *
 * Requests per speech are what the free tier counts, so this adapter never
 * retries on its own except once after "rate limit reached", and the SDK's
 * built-in retries (5 attempts by default) are switched off.
 */

const { generation } = practice;

/** The strictest setting for every text safety category. */
const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }));

function thinkingConfig(model: string): ThinkingConfig | undefined {
  const thinking = thinkingFor(model);
  if (thinking.kind === "level") {
    return { thinkingLevel: thinking.level === "MINIMAL" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW };
  }
  if (thinking.kind === "budget") return { thinkingBudget: thinking.tokens };
  return undefined;
}

function usageOf(response: GenerateContentResponse | undefined): TokenUsage {
  const usage = response?.usageMetadata;
  return {
    input: usage?.promptTokenCount ?? 0,
    output: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
  };
}

/** Throws AIError("blocked") if a safety filter stopped this response. */
function throwIfBlocked(response: GenerateContentResponse): void {
  if (response.promptFeedback?.blockReason) {
    throw new AIError("blocked", `Prompt blocked: ${response.promptFeedback.blockReason}`);
  }
  const reason = response.candidates?.[0]?.finishReason;
  if (isBlockingFinish(reason)) throw new AIError("blocked", `Reply stopped: ${reason}`);
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof ApiError && error.status === 429) {
    return new AIError("rate_limited", "Gemini rate limit reached", { cause: error });
  }
  return new AIError("failed", error instanceof Error ? error.message : "Gemini request failed", {
    cause: error,
  });
}

/** Runs a request, retrying once after a short "rate limit reached". */
async function withRateLimitRetry<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 429 || !isRetryableRateLimit(error.message)) {
      throw toAIError(error);
    }
    const seconds = retryDelaySeconds(error.message, generation.rateLimitRetryMaxSeconds);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    try {
      return await request();
    } catch (retryError) {
      throw toAIError(retryError);
    }
  }
}

export function createGeminiWriter({ apiKey, model }: { apiKey: string; model: string }): SpeechWriter {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: generation.requestTimeoutSeconds * 1000,
      retryOptions: { attempts: 1 },
    },
  });

  function config(settings: SpeechSettings, maxOutputTokens: number): GenerateContentConfig {
    return {
      systemInstruction: systemInstruction(settings),
      maxOutputTokens,
      safetySettings: SAFETY_SETTINGS,
      thinkingConfig: thinkingConfig(model),
    };
  }

  function sectionTokens(settings: SpeechSettings, words: number): number {
    const { tokensPerWord } = practice.languages[settings.language];
    return Math.ceil(words * tokensPerWord * 1.3) + generation.sectionTokenAllowance;
  }

  async function* stream(settings: SpeechSettings, prompt: string, words: number): AsyncIterable<StreamChunk> {
    const responses = await withRateLimitRetry(() =>
      client.models.generateContentStream({
        model,
        contents: prompt,
        config: config(settings, sectionTokens(settings, words)),
      }),
    );

    let last: GenerateContentResponse | undefined;
    try {
      for await (const response of responses) {
        throwIfBlocked(response);
        last = response;
        const text = response.text;
        if (text) yield { type: "text", text };
      }
    } catch (error) {
      throw toAIError(error);
    }
    yield { type: "usage", usage: usageOf(last) };
  }

  return {
    model: `gemini:${model}`,

    async outline(request) {
      const response = await withRateLimitRetry(() =>
        client.models.generateContent({
          model,
          contents: outlinePrompt(request),
          config: {
            ...config(request, generation.outlineMaxTokens),
            responseMimeType: "application/json",
            responseJsonSchema: outlineJsonSchema,
          },
        }),
      );
      throwIfBlocked(response);

      let json: unknown;
      try {
        json = JSON.parse(response.text ?? "");
      } catch {
        throw new AIError("invalid_output", "Outline was not valid JSON");
      }
      const parsed = rawOutlineSchema.safeParse(json);
      if (!parsed.success) throw new AIError("invalid_output", "Outline did not match the schema");

      return { outline: parsed.data, usage: usageOf(response) };
    },

    section(request: SectionRequest) {
      return stream(request, sectionPrompt(request), request.outline[request.index].words);
    },

    extend(request: ExtendRequest) {
      return stream(request, extendPrompt(request), request.missingWords);
    },
  };
}
