import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PracticeLink } from "@/components/teleprompter/practice-link";
import { libraryCategories, librarySpeeches, type LibraryCategory } from "@/content/library";
import { requireUser } from "@/lib/auth/session";
import { getOpenSampleSessions } from "@/lib/practice/data";
import { getAllLibrarySpeeches, type LibrarySpeech } from "@/lib/samples";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Speech library",
  robots: { index: false },
};

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const smallPrimary =
  "inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium whitespace-nowrap text-on-ink transition-colors hover:bg-ink-soft";
const smallSecondary =
  "inline-flex items-center justify-center rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:border-faint";

export default function LibraryPage() {
  return (
    <div data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <p>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Your speeches
        </Link>
      </p>
      <header className="mt-4">
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
          Speech library. <span className="text-faint">Ready when you are.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {librarySpeeches.length} ready-made speeches on study, space, AI and more. They&apos;re free to practise
          as often as you like, and they don&apos;t use your free speeches.
        </p>
      </header>

      {/* Reads the session, so it streams in. */}
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-8 p-7 text-muted`}>
            Loading the library…
          </p>
        }
      >
        <Library />
      </Suspense>
    </div>
  );
}

async function Library() {
  await requireUser("/library");
  const sessions = await getOpenSampleSessions(
    await createClient(),
    librarySpeeches.map((speech) => speech.slug),
  );

  const speeches = getAllLibrarySpeeches();
  const groups = (Object.keys(libraryCategories) as LibraryCategory[])
    .map((category) => ({ category, speeches: speeches.filter((speech) => speech.category === category) }))
    .filter((group) => group.speeches.length > 0);

  return (
    <div className="mt-8 space-y-8">
      {groups.map(({ category, speeches: inGroup }) => (
        <section key={category} aria-labelledby={`library-${category}`} className={`${card} px-5 sm:px-7`}>
          <h2 id={`library-${category}`} className="pt-6 text-lg font-semibold tracking-tight">
            {libraryCategories[category]}
          </h2>
          <ul className="divide-y divide-line">
            {inGroup.map((speech) => (
              <LibraryRow key={speech.slug} speech={speech} session={sessions ? (sessions.get(speech.slug) ?? null) : undefined} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LibraryRow({ speech, session }: { speech: LibrarySpeech; session: Parameters<typeof PracticeLink>[0]["session"] }) {
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link href={`/library/${speech.slug}`} className="font-medium underline-offset-4 hover:underline">
          {speech.title}
        </Link>
        <p className="mt-1 text-sm text-muted">{speech.summary}</p>
        <p className="mt-1 text-sm text-muted">
          {speech.minutes} min · {speech.speech.wordCount} words
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <PracticeLink
          speechId={`sample:${speech.slug}`}
          wordCount={speech.speech.wordCount}
          href={`/library/${speech.slug}/practice`}
          session={session}
          startLabel="Practise"
          className={smallPrimary}
        />
        <Link href={`/library/${speech.slug}`} className={smallSecondary}>
          Read
        </Link>
      </div>
    </li>
  );
}
