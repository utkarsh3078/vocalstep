"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { chooseResume, type OpenSession } from "@/lib/practice/resume";
import { parseProgress, progressKey } from "@/lib/teleprompter/storage";
import { formatPercent, progressAt } from "@/lib/teleprompter/timing";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The button that opens the teleprompter. Reads "Resume (NN%)" when there is
 * unfinished progress, and "Start Teleprompter" otherwise.
 *
 * Progress comes from this browser and, for signed-in users, from their
 * unfinished session on the server (`session`), chosen the same way the
 * teleprompter chooses where to resume. Leave `session` out for guests.
 *
 * Lists pass a smaller `className` and their own `startLabel`.
 */
export function PracticeLink({
  speechId,
  wordCount,
  href,
  session,
  startLabel = "Start Teleprompter",
  className = "inline-block rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700",
}: {
  speechId: string;
  wordCount: number;
  href: string;
  session?: OpenSession | null;
  startLabel?: string;
  className?: string;
}) {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(progressKey(speechId));
      } catch {
        return null;
      }
    },
    () => null,
  );

  let parsed: unknown = null;
  if (stored !== null) {
    try {
      parsed = JSON.parse(stored);
    } catch {
      // Unreadable progress is treated as none.
    }
  }
  const resume = chooseResume(parseProgress(parsed, wordCount), session, wordCount);
  const label = resume
    ? `Resume (${formatPercent(progressAt(resume.wordIndex, wordCount))})`
    : startLabel;

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
