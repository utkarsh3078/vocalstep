"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SpeechContent } from "@/components/speech-content";
import type { LanguageCode, RefusalReason } from "@/config/practice";
import { parseSpeech } from "@/lib/speech/blocks";
import {
  applyEvent,
  decodeEvents,
  toMarkdown,
  type GenerationErrorCode,
  type GenerationEvent,
  type StreamedSpeech,
} from "@/lib/speech/stream";

export interface Failure {
  code: GenerationErrorCode;
  reason?: RefusalReason;
}

/** The body of POST /api/speeches/generate: new settings, or a speech to write again. */
export type GenerateRequest =
  | { topic: string; minutes: number; language: LanguageCode; difficulty: string }
  | { replaces: string };

/**
 * Calls the streaming route and follows the speech as it is written. Opens
 * the review page when the speech is saved. Shared by Create and Regenerate.
 */
export function useSpeechGeneration() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [speech, setSpeech] = useState<StreamedSpeech>({ sections: [] });
  const [failure, setFailure] = useState<Failure | null>(null);

  async function generate(body: GenerateRequest) {
    setFailure(null);
    setSpeech({ sections: [] });
    setGenerating(true);

    const stop = (result: Failure) => {
      setFailure(result);
      setGenerating(false);
      // The free-speech count or the page's state may have changed.
      if (result.code === "free_used") router.refresh();
    };

    let response: Response;
    try {
      response = await fetch("/api/speeches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      stop({ code: "failed" });
      return;
    }

    if (!response.ok || !response.body) {
      const result = (await response.json().catch(() => null)) as GenerationEvent | null;
      stop(result?.type === "error" ? { code: result.code, reason: result.reason } : { code: "failed" });
      return;
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let current: StreamedSpeech = { sections: [] };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const { events, rest } = decodeEvents(buffer + value);
        buffer = rest;
        for (const streamEvent of events) {
          if (streamEvent.type === "done") {
            const notice =
              streamEvent.replaced === undefined ? "" : `?regenerated=${streamEvent.replaced ? "replaced" : "kept"}`;
            router.push(`/speeches/${streamEvent.speechId}${notice}`);
            return;
          }
          if (streamEvent.type === "error") {
            stop({ code: streamEvent.code, reason: streamEvent.reason });
            return;
          }
          current = applyEvent(current, streamEvent);
        }
        setSpeech(current);
      }
    } catch {
      // The connection dropped. The server keeps going and saves the speech
      // if it can, so it may still appear in "Your speeches".
    }
    stop({ code: "failed" });
  }

  return { generating, speech, failure, generate };
}

/** The speech as it is being written. */
export function GeneratingView({ speech, language }: { speech: StreamedSpeech; language: LanguageCode }) {
  const { blocks, wordCount } = parseSpeech(toMarkdown(speech));
  return (
    <section aria-live="polite" aria-busy="true">
      {wordCount === 0 ? (
        <p role="status" className="text-lg">
          Preparing your speaking session...
        </p>
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            Writing your speech… {wordCount} words so far. Please keep this page open.
          </p>
          {speech.title && <h2 className="mt-4 text-2xl font-bold tracking-tight">{speech.title}</h2>}
          <div className="mt-4">
            <SpeechContent blocks={blocks} language={language} />
          </div>
        </>
      )}
    </section>
  );
}
