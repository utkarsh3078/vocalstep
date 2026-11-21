"use client";

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
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          <p>{generationErrorMessage(failure.code, failure.reason)}</p>
          {failure.code === "unauthorized" && (
            <Link
              href={`/login?next=${encodeURIComponent(`/speeches/${speechId}/regenerate`)}`}
              className="mt-2 inline-block underline underline-offset-4"
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
          className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
        >
          Write a new version
        </button>
        <Link
          href={`/speeches/${speechId}`}
          className="rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
