"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SpeechContent } from "@/components/speech-content";
import { practice, type Difficulty, type LanguageCode, type RefusalReason } from "@/config/practice";
import { parseSpeech } from "@/lib/speech/blocks";
import { generationErrorMessage } from "@/lib/speech/messages";
import {
  applyEvent,
  decodeEvents,
  toMarkdown,
  type GenerationErrorCode,
  type GenerationEvent,
  type StreamedSpeech,
} from "@/lib/speech/stream";

interface Failure {
  code: GenerationErrorCode;
  reason?: RefusalReason;
}

const { topic: topicRules } = practice;

/**
 * The Create form and the live view of a speech being written. Calls the
 * streaming route and shows text as it arrives; opens the review page when the
 * speech is saved.
 */
export function CreateSpeech({
  initialTopic,
  defaultLanguage,
  defaultDifficulty,
  freeLeft,
}: {
  initialTopic: string;
  defaultLanguage: LanguageCode;
  defaultDifficulty: Difficulty;
  freeLeft: number;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [minutes, setMinutes] = useState<number>(practice.defaultDuration);
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [generating, setGenerating] = useState(false);
  const [speech, setSpeech] = useState<StreamedSpeech>({ sections: [] });
  const [failure, setFailure] = useState<Failure | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  const trimmed = topic.trim();

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < topicRules.minLength || trimmed.length > topicRules.maxLength) {
      setTopicError(`Use ${topicRules.minLength} to ${topicRules.maxLength} characters.`);
      return;
    }

    setTopicError(null);
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
        body: JSON.stringify({ topic: trimmed, minutes, language, difficulty }),
      });
    } catch {
      stop({ code: "failed" });
      return;
    }

    if (!response.ok || !response.body) {
      const body = (await response.json().catch(() => null)) as GenerationEvent | null;
      stop(body?.type === "error" ? { code: body.code, reason: body.reason } : { code: "failed" });
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
            router.push(`/speeches/${streamEvent.speechId}`);
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

  if (generating) {
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

  return (
    <form onSubmit={generate} noValidate className="space-y-6">
      {failure && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          <p>{generationErrorMessage(failure.code, failure.reason)}</p>
          {failure.code === "unauthorized" && (
            <Link href="/login?next=%2Fcreate" className="mt-2 inline-block underline underline-offset-4">
              Sign in
            </Link>
          )}
        </div>
      )}

      <div>
        <label htmlFor="topic" className="block font-medium">
          Topic
        </label>
        <textarea
          id="topic"
          name="topic"
          rows={3}
          maxLength={topicRules.maxLength}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="What would you like to speak about today?"
          aria-invalid={topicError ? true : undefined}
          aria-describedby={`topic-count${topicError ? " topic-error" : ""}`}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-lg ${topicError ? "border-red-600" : "border-neutral-400"}`}
        />
        <p id="topic-count" className="mt-1 text-sm text-neutral-600">
          {trimmed.length} / {topicRules.maxLength} characters
        </p>
        {topicError && (
          <p id="topic-error" className="mt-1 text-sm text-red-700">
            {topicError}
          </p>
        )}

        <p className="mt-3 text-sm text-neutral-700">Or try one of these:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {topicRules.examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setTopic(example)}
                className="rounded-full border border-neutral-400 px-3 py-1 text-sm hover:bg-neutral-100"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <fieldset>
        <legend className="font-medium">How long do you want to speak?</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {practice.durations.map((duration) => (
            <label key={duration} className="flex items-center gap-2">
              <input
                type="radio"
                name="minutes"
                value={duration}
                checked={minutes === duration}
                onChange={() => setMinutes(duration)}
              />
              {duration} minutes
            </label>
          ))}
        </div>
      </fieldset>

      <details className="rounded-md border border-neutral-300 p-3">
        <summary className="cursor-pointer font-medium">More options</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="language" className="block text-sm font-medium">
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
              className="mt-1 block w-full rounded-md border border-neutral-400 px-3 py-2"
            >
              {Object.entries(practice.languages).map(([code, { label }]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium">
              Difficulty
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as Difficulty)}
              className="mt-1 block w-full rounded-md border border-neutral-400 px-3 py-2"
            >
              {Object.entries(practice.difficulties).map(([code, { label }]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <div>
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700 sm:w-auto"
        >
          Generate My Speech
        </button>
        <p className="mt-2 text-sm text-neutral-600">
          {freeLeft === 1 ? "1 free speech left." : `${freeLeft} free speeches left.`} Refused topics
          and failed attempts don&apos;t count.
        </p>
      </div>
    </form>
  );
}
