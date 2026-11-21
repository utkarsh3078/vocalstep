"use client";

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

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />

      {state.error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="title" className="block font-medium">
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
          className="mt-1 block w-full rounded-md border border-neutral-400 px-3 py-2"
        />
        <p id="title-help" className="mt-1 text-sm text-neutral-600">
          Leave it empty to use your topic.
        </p>
      </div>

      <div>
        <label htmlFor="content" className="block font-medium">
          Speech
        </label>
        <p id="content-help" className="mt-1 text-sm text-neutral-600">
          Start a line with <code>## </code> for a section heading. Headings are shown in the
          teleprompter but not counted as words. Leave a blank line between paragraphs.
        </p>
        <textarea
          id="content"
          name="content"
          rows={20}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-describedby="content-help content-count"
          aria-invalid={checked.ok ? undefined : true}
          className="mt-2 block w-full rounded-md border border-neutral-400 px-3 py-2 leading-relaxed"
        />
        <p id="content-count" aria-live="polite" className="mt-1 text-sm text-neutral-600">
          {wordCount !== null
            ? `${wordCount} words · ${formatSpeakingTime(speakingSeconds(wordCount, wpm))} at ${wpm} words per minute`
            : editProblemMessage(checked.ok ? "too_short" : checked.problem)}
        </p>
      </div>

      <p className="text-sm text-neutral-600">
        Saving changed text starts your practice of this speech from the beginning. Your practice
        minutes and streak are kept.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending || !checked.ok}
          className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/speeches/${id}`}
          className="rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
