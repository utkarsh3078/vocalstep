"use client"; // Error boundaries must be Client Components.

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert">
      <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-4 text-muted">
        This page could not be shown. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft"
        >
          Try again
        </button>
        <Link href="/" className="underline underline-offset-4">
          Back to the home page
        </Link>
      </div>
    </section>
  );
}
