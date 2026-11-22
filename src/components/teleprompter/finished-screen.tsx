import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { formatDays, formatMinutes } from "@/lib/practice/streaks";
import { formatClock } from "@/lib/teleprompter/timing";

import type { FinishTotals } from "./teleprompter";

/** Shown over the teleprompter when a session ends. */
export function FinishedScreen({
  title,
  activeSeconds,
  totals,
  dark,
  onPractiseAgain,
}: {
  title: string;
  activeSeconds: number;
  totals: FinishTotals;
  dark: boolean;
  onPractiseAgain: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus here so keyboard and screen reader users land on the result.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const muted = dark ? "text-neutral-300" : "text-muted";
  const secondaryButton = `inline-flex items-center justify-center rounded-full border px-5 py-3 font-medium transition-colors ${
    dark ? "border-neutral-700 hover:bg-neutral-800" : "border-line bg-surface hover:border-faint"
  }`;
  const tile = `rounded-2xl px-4 py-4 ${dark ? "bg-neutral-900" : "bg-canvas"}`;
  const signedIn = totals.state !== "guest";

  return (
    <section
      aria-labelledby="finished-heading"
      className={`absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-4 py-10 ${dark ? "bg-neutral-950" : "bg-white"}`}
    >
      <div className="w-full max-w-lg text-center">
        <span
          aria-hidden="true"
          className={`mx-auto mb-6 flex size-14 items-center justify-center rounded-full ${dark ? "bg-mint-400/15 text-mint-400" : "bg-mint-50 text-mint-700"}`}
        >
          <Check className="size-7" strokeWidth={2.5} />
        </span>
        <h2
          id="finished-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-[-0.03em] outline-none sm:text-4xl"
        >
          Well done!
        </h2>
        <p className={`mt-3 ${muted}`}>You finished “{title}”.</p>

        {/* Full width on phones; on wider screens each tile keeps its size, centred (a guest has just one). */}
        <dl className="mt-8 flex flex-wrap justify-center gap-3 [&>div]:min-w-40 [&>div]:flex-1 sm:[&>div]:flex-none">
          <div className={tile}>
            <dt className="text-sm tracking-wide uppercase opacity-70">Time spoken</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{formatClock(activeSeconds)}</dd>
          </div>
          {signedIn && (
            <>
              <div className={tile}>
                <dt className="text-sm tracking-wide uppercase opacity-70">Today</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums">
                  {totals.state === "ready" ? formatMinutes(totals.stats.todaySeconds) : "–"}
                </dd>
              </div>
              <div className={tile}>
                <dt className="text-sm tracking-wide uppercase opacity-70">Streak</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums">
                  {totals.state === "ready" ? formatDays(totals.stats.currentStreak) : "–"}
                </dd>
              </div>
            </>
          )}
        </dl>

        <div aria-live="polite" className={`mt-4 text-sm ${muted}`}>
          {totals.state === "loading" && <p role="status">Saving your practice…</p>}
          {totals.state === "failed" && (
            <p>We couldn&apos;t update your totals just now. Your next practice will still count.</p>
          )}
          {totals.state === "guest" && (
            <p>
              <Link href="/signup" className="underline underline-offset-4">
                Create a free account
              </Link>{" "}
              to keep track of your minutes and your daily streak.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onPractiseAgain}
            className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-medium transition-colors ${dark ? "bg-white text-neutral-950 hover:bg-neutral-200" : "bg-ink text-on-ink hover:bg-ink-soft"}`}
          >
            Practise again
          </button>
          {signedIn ? (
            <>
              <Link href="/create" className={secondaryButton}>
                New topic
              </Link>
              <Link href="/dashboard" className={secondaryButton}>
                Dashboard
              </Link>
            </>
          ) : (
            <Link href="/" className={secondaryButton}>
              Back to home
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
