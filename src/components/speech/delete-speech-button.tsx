"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { deleteSpeech } from "@/app/actions/speeches";

/**
 * Delete, with a confirmation step in place. After deleting, goes to
 * `afterDeleteHref` (the history, which says the speech was deleted).
 */
export function DeleteSpeechButton({
  id,
  title,
  afterDeleteHref,
  className,
}: {
  id: string;
  title: string;
  afterDeleteHref: string;
  className: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // Keyboard and screen reader users land on the choice, and back on Delete after Cancel.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocus.current) openRef.current?.focus();
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        ref={openRef}
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={className}
      >
        Delete
      </button>
    );
  }

  return (
    <div role="group" aria-labelledby={`delete-${id}`} className="w-full rounded-md border border-red-300 bg-red-50 p-3">
      <p id={`delete-${id}`} className="text-red-900">
        Delete “{title}”? You can&apos;t undo this. Your practice minutes and streak are kept.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-red-800">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          ref={confirmRef}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSpeech(id);
              if (result.ok) router.replace(afterDeleteHref);
              else setError(result.error);
            })
          }
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            returnFocus.current = true;
            setConfirming(false);
          }}
          className="rounded-md border border-neutral-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
