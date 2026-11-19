"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { parseProgress, progressKey } from "@/lib/teleprompter/storage";
import { formatPercent, progressAt } from "@/lib/teleprompter/timing";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * The button that opens the teleprompter. Reads "Resume (NN%)" when this
 * browser has unfinished progress for the speech, and "Start Teleprompter"
 * otherwise (including on the server, where storage is not available).
 */
export function PracticeLink({
  speechId,
  wordCount,
  href,
}: {
  speechId: string;
  wordCount: number;
  href: string;
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

  let label = "Start Teleprompter";
  if (stored !== null) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(stored);
    } catch {
      // Unreadable progress is treated as none.
    }
    const progress = parseProgress(parsed, wordCount);
    if (progress) {
      label = `Resume (${formatPercent(progressAt(progress.wordIndex, wordCount))})`;
    }
  }

  return (
    <Link
      href={href}
      className="inline-block rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
    >
      {label}
    </Link>
  );
}
