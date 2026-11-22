"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { GeneratingView, useSpeechGeneration } from "@/components/create/use-speech-generation";
import type { LanguageCode } from "@/config/practice";
import { generationErrorMessage } from "@/lib/speech/messages";

/** The Regenerate button and the new speech as it is written. */
export function RegenerateSpeech({ speechId, language }: { speechId: string; language: LanguageCode }) {
  const { generating, speech, failure, generate } = useSpeechGeneration();

  if (generating) return <GeneratingView speech={speech} language={language} />;

  return (
    <div className="space-y-4">
      {failure && (
        <div role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-danger-800">
          <p>{generationErrorMessage(failure.code, failure.reason)}</p>
          {failure.code === "unauthorized" && (
            <Link
              href={`/login?next=${encodeURIComponent(`/speeches/${speechId}/regenerate`)}`}
              className="mt-2 inline-block font-medium underline underline-offset-4"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void generate({ replaces: speechId })}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Write a new version
        </button>
        <Link
          href={`/speeches/${speechId}`}
          className="inline-flex items-center rounded-full border border-line bg-surface px-5 py-3 font-medium transition-colors hover:border-faint"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
