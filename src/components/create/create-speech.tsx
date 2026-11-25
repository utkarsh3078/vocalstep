"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { offeredLanguages, practice, type Difficulty, type LanguageCode } from "@/config/practice";
import { generationErrorMessage } from "@/lib/speech/messages";
import { wordTarget } from "@/lib/speech/targets";

import { GeneratingView, useSpeechGeneration } from "./use-speech-generation";

const { topic: topicRules } = practice;

/** A choice drawn as a card or pill; the real radio input stays focusable for keyboards. */
const choice =
  "relative cursor-pointer rounded-2xl border border-line bg-surface transition-colors hover:border-faint has-checked:border-ink has-checked:bg-canvas has-checked:shadow-[inset_0_0_0_1px_var(--vs-ink)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink";

/**
 * The Create form and the live view of a speech being written (see
 * useSpeechGeneration).
 */
export function CreateSpeech({
  initialTopic,
  defaultLanguage,
  defaultDifficulty,
}: {
  initialTopic: string;
  defaultLanguage: LanguageCode;
  defaultDifficulty: Difficulty;
}) {
  const [topic, setTopic] = useState(initialTopic);
  const [minutes, setMinutes] = useState<number>(practice.defaultDuration);
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [topicError, setTopicError] = useState<string | null>(null);
  const { generating, speech, failure, generate } = useSpeechGeneration();

  const trimmed = topic.trim();
  const { wpm } = practice.languages[language];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed.length < topicRules.minLength || trimmed.length > topicRules.maxLength) {
      setTopicError(`Use ${topicRules.minLength} to ${topicRules.maxLength} characters.`);
      return;
    }
    setTopicError(null);
    void generate({ topic: trimmed, minutes, language, difficulty });
  }

  if (generating) return <GeneratingView speech={speech} language={language} />;

  return (
    <form onSubmit={submit} noValidate className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      {failure && (
        <div role="alert" className="mb-6 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-danger-800">
          <p>{generationErrorMessage(failure.code, failure.reason)}</p>
          {failure.code === "unauthorized" && (
            <Link href="/login?next=%2Fcreate" className="mt-2 inline-block font-medium underline underline-offset-4">
              Sign in
            </Link>
          )}
        </div>
      )}

      <div>
        <label htmlFor="topic" className="block text-lg font-semibold tracking-tight">
          Your topic
        </label>
        <p id="topic-help" className="mt-1 text-sm text-muted">
          Anything you&apos;d like to speak about or learn about.
        </p>
        <textarea
          id="topic"
          name="topic"
          rows={3}
          maxLength={topicRules.maxLength}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="What would you like to speak about today?"
          aria-invalid={topicError ? true : undefined}
          aria-describedby={`topic-help topic-count${topicError ? " topic-error" : ""}`}
          className={`mt-3 block w-full resize-y rounded-2xl border px-4 py-3 text-lg leading-relaxed placeholder:text-faint ${
            topicError ? "border-danger-600" : "border-line"
          }`}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-2 text-sm">
          {topicError ? (
            <p id="topic-error" className="text-danger-700">
              {topicError}
            </p>
          ) : (
            <span />
          )}
          <p id="topic-count" className="text-muted tabular-nums">
            {trimmed.length} / {topicRules.maxLength} characters
          </p>
        </div>

        <p className="mt-4 text-sm font-medium text-muted">Need an idea? Try one of these:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {topicRules.examples.map((example) => (
            <li key={example}>
              <button
                type="button"
                onClick={() => setTopic(example)}
                className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm transition-colors hover:border-faint hover:bg-surface"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {practice.durations.length === 1 ? (
        // One length on offer: say what it is, rather than show a choice of one.
        <p className="mt-8 text-muted">
          <span className="font-semibold text-ink">{practice.durations[0]}-minute speech</span>, about{" "}
          {wordTarget(practice.durations[0], wpm)} words.
        </p>
      ) : (
        <fieldset className="mt-8">
          <legend className="text-lg font-semibold tracking-tight">How long do you want to speak?</legend>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {practice.durations.map((duration) => (
              <label key={duration} className={`${choice} px-4 py-4 text-center`}>
                <input
                  type="radio"
                  name="minutes"
                  value={duration}
                  checked={minutes === duration}
                  onChange={() => setMinutes(duration)}
                  className="sr-only"
                />
                <span className="block text-2xl font-semibold tracking-tight tabular-nums">{duration}</span>
                <span className="block text-sm text-muted">minutes</span>
                <span className="mt-2 block text-xs text-muted tabular-nums">
                  <span className="hidden sm:inline">about </span>
                  {wordTarget(duration, wpm)} words
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <details className="group mt-6 rounded-2xl border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
          <span>
            More options{" "}
            <span className="font-normal text-muted">· {practice.difficulties[difficulty].label}</span>
          </span>
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-5 border-t border-line px-4 py-4">
          {/* With only one language offered there is nothing to choose. */}
          {offeredLanguages.length > 1 && (
            <div>
              <label htmlFor="language" className="block text-sm font-medium">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                className="mt-2 block w-full rounded-xl border border-line px-3 py-2"
              >
                {offeredLanguages.map((code) => (
                  <option key={code} value={code}>
                    {practice.languages[code].label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <fieldset>
            <legend className="text-sm font-medium">Difficulty</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(practice.difficulties) as Difficulty[]).map((code) => (
                <label key={code} className={`${choice} rounded-full px-4 py-2 text-sm font-medium`}>
                  <input
                    type="radio"
                    name="difficulty"
                    value={code}
                    checked={difficulty === code}
                    onChange={() => setDifficulty(code)}
                    className="sr-only"
                  />
                  {practice.difficulties[code].label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-medium text-on-ink transition-colors hover:bg-ink-soft sm:w-auto"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Generate My Speech
        </button>
        <p className="text-sm text-muted">
          This uses 1 free speech. Refused topics and failed attempts don&apos;t count.
        </p>
      </div>
    </form>
  );
}
