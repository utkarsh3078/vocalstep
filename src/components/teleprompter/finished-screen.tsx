import Link from "next/link";
import { useEffect, useRef } from "react";

import { formatClock } from "@/lib/teleprompter/timing";

/** Shown over the teleprompter when a session ends. */
export function FinishedScreen({
  title,
  activeSeconds,
  dark,
  onPractiseAgain,
}: {
  title: string;
  activeSeconds: number;
  dark: boolean;
  onPractiseAgain: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus here so keyboard and screen reader users land on the result.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="finished-heading"
      className={`absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-4 py-10 ${dark ? "bg-neutral-950" : "bg-white"}`}
    >
      <div className="w-full max-w-md text-center">
        <h2
          id="finished-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-bold tracking-tight"
        >
          Well done!
        </h2>
        <p className={`mt-3 ${dark ? "text-neutral-300" : "text-neutral-700"}`}>
          You finished “{title}”.
        </p>
        <p className="mt-6 text-sm tracking-wide uppercase opacity-70">Time spoken</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums">{formatClock(activeSeconds)}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onPractiseAgain}
            className={`rounded-md px-5 py-3 font-medium ${dark ? "bg-white text-neutral-950 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-700"}`}
          >
            Practise again
          </button>
          <Link
            href="/"
            className={`rounded-md border px-5 py-3 font-medium ${dark ? "border-neutral-600 hover:bg-neutral-800" : "border-neutral-300 hover:bg-neutral-100"}`}
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
