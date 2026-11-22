"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { saveSpeechEdit, type EditState } from "@/app/actions/speeches";
import { practice } from "@/config/practice";
import { checkEdit, editProblemMessage } from "@/lib/speech/edit";
import { formatSpeakingTime, speakingSeconds } from "@/lib/speech/targets";

/**
 * The Edit page form: the title and the speech as markdown. Shows the word
 * count and speaking time as you type, with the same rules the server checks.
 */
export function EditSpeechForm({
  id,
  version,
  initialTitle,
  initialContent,
  topic,
  wpm,
}: {
  id: string;
  version: number;
  initialTitle: string;
  initialContent: string;
  topic: string;
  wpm: number;
}) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(saveSpeechEdit, {});
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  const checked = checkEdit(title, content);
  const dirty = title !== initialTitle || content !== initialContent;
  const wordCount = checked.ok ? checked.edit.wordCount : null;

  // Warn before closing or reloading the tab with unsaved changes. The
  // listener goes when the page is hidden or left (see CLAUDE.md on Activity).
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  const speakingTime = wordCount !== null ? formatSpeakingTime(speakingSeconds(wordCount, wpm)) : null;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />

      <div className="space-y-6">
        {state.error && (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {state.error}
          </p>
        )}

        <div className="rounded-card bg-surface p-6 shadow-card sm:p-8">
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            maxLength={practice.edit.maxTitleLength}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={topic}
            aria-describedby="title-help"
            className="mt-2 block w-full rounded-xl border border-line px-4 py-3 text-lg font-semibold tracking-tight placeholder:font-normal placeholder:text-faint"
          />
          <p id="title-help" className="mt-1.5 text-sm text-muted">
            Leave it empty to use your topic.
          </p>

          <label htmlFor="content" className="mt-8 block text-sm font-medium">
            Speech
          </label>
          <textarea
            id="content"
            name="content"
            rows={22}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            aria-describedby="content-help content-count"
            aria-invalid={checked.ok ? undefined : true}
            className={`mt-2 block w-full resize-y rounded-2xl border px-4 py-3 text-lg leading-8 text-ink-soft ${
              checked.ok ? "border-line" : "border-red-600"
            }`}
          />
          <p
            id="content-count"
            aria-live="polite"
            className={`mt-2 text-sm ${checked.ok ? "text-muted" : "text-red-700"}`}
          >
            {wordCount !== null
              ? `${wordCount} words · ${speakingTime} at ${wpm} words per minute`
              : editProblemMessage(checked.ok ? "too_short" : checked.problem)}
          </p>
        </div>
      </div>

      <aside aria-label="Save your changes" className="space-y-6 lg:sticky lg:top-6">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Words</dt>
              <dd className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">{wordCount ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Speaking time</dt>
              <dd className="mt-2 font-medium">{speakingTime ?? "–"}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-muted">
            Saving changed text starts your practice of this speech from the beginning. Your practice
            minutes and streak are kept.
          </p>
          <div className="mt-5 grid gap-2">
            <button
              type="submit"
              disabled={pending || !checked.ok}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save aria-hidden="true" className="size-4" />
              {pending ? "Saving…" : "Save changes"}
            </button>
            <Link
              href={`/speeches/${id}`}
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-5 py-3 font-medium transition-colors hover:border-faint"
            >
              Cancel
            </Link>
          </div>
        </div>

        <div id="content-help" className="rounded-card bg-canvas p-6 text-sm text-muted ring-1 ring-line">
          <p className="font-medium text-ink">Formatting</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-mint-700">
            <li>
              Start a line with <code className="rounded bg-surface px-1 py-0.5 text-ink">## </code> for a section
              heading.
            </li>
            <li>Headings are shown in the teleprompter but not counted as words.</li>
            <li>Leave a blank line between paragraphs.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
