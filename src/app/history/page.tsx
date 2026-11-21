import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DeleteSpeechButton } from "@/components/speech/delete-speech-button";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getHistoryPage, type HistoryEntry } from "@/lib/practice/data";
import { formatPracticeTime, pageCount, parsePage, practiceStatusLabel } from "@/lib/practice/history";
import { getProfileDefaults } from "@/lib/speech/data";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your speeches",
  robots: { index: false },
};

const STATUS_LABELS: Record<HistoryEntry["status"], string> = {
  ready: "Ready",
  generating: "Being written",
  failed: "Couldn't be written",
};

const smallButton =
  "inline-block rounded-md border border-neutral-400 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100";

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Your speeches</h1>
      <p className="mt-2 text-neutral-700">Every speech you&apos;ve created, and how you&apos;ve practised it.</p>
      <Suspense fallback={<p role="status" className="mt-6">Loading your speeches…</p>}>
        <History searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function History({ searchParams }: Pick<PageProps<"/history">, "searchParams">) {
  const query = await searchParams;
  const page = parsePage(firstParam(query.page));
  const deleted = firstParam(query.deleted) === "1";
  const user = await requireUser(page > 1 ? `/history?page=${page}` : "/history");

  const supabase = await createClient();
  const [history, defaults] = await Promise.all([
    getHistoryPage(supabase, page),
    getProfileDefaults(supabase, user.id),
  ]);

  if (!history) {
    return (
      <p role="alert" className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
        We couldn&apos;t load your speeches just now. Please refresh the page.
      </p>
    );
  }

  const pages = pageCount(history.total, practice.lists.historyPageSize);

  const deletedNotice = deleted && (
    <p role="status" className="mt-6 rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
      The speech has been deleted. Your practice minutes and streak are kept.
    </p>
  );

  if (history.total === 0) {
    return (
      <div className="mt-6 text-neutral-700">
        {deletedNotice}
        <p>You haven&apos;t created any speeches yet.</p>
        <p className="mt-4">
          <Link
            href="/create"
            className="inline-block rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
          >
            Create your first speech
          </Link>
        </p>
      </div>
    );
  }

  if (history.entries.length === 0) {
    return (
      <>
        {deletedNotice}
        <p className="mt-6 text-neutral-700">
          There&apos;s nothing on this page.{" "}
          <Link href={pageHref(pages)} className="underline underline-offset-4">
            Go to the last page
          </Link>
        </p>
      </>
    );
  }

  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: defaults.timezone });

  const afterDeleteHref = `${pageHref(page)}${page > 1 ? "&" : "?"}deleted=1`;

  return (
    <>
      {deletedNotice}
      <p className="mt-6 text-sm text-neutral-600">
        {history.total === 1 ? "1 speech" : `${history.total} speeches`}
      </p>
      <ul className="mt-3 space-y-3">
        {history.entries.map((entry) => (
          <li key={entry.id} className="rounded-md border border-neutral-300 p-3">
            <Link href={`/speeches/${entry.id}`} className="font-medium underline underline-offset-4">
              {entry.title || entry.topic}
            </Link>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <Detail label="Length" value={`${entry.targetMinutes} min`} />
              {entry.status === "ready" ? (
                <Detail label="Words" value={String(entry.wordCount)} />
              ) : (
                <Detail label="Status" value={STATUS_LABELS[entry.status]} />
              )}
              <Detail label="Created" value={date.format(new Date(entry.createdAt))} />
              <Detail
                label="Last practised"
                value={entry.practice.lastPractisedAt ? date.format(new Date(entry.practice.lastPractisedAt)) : "Not yet"}
              />
              <Detail label="Practice" value={practiceStatusLabel(entry.practice)} />
              <Detail label="Time spent" value={formatPracticeTime(entry.practice.activeSeconds)} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/speeches/${entry.id}`} className={smallButton}>
                Read
              </Link>
              {entry.status === "ready" && (
                <PracticeLink
                  speechId={`speech:${entry.id}:v${entry.version}`}
                  wordCount={entry.wordCount}
                  href={`/speeches/${entry.id}/practice`}
                  session={entry.practice.open}
                  startLabel={entry.practice.lastPractisedAt ? "Practise again" : "Practise"}
                  className={smallButton}
                />
              )}
              {entry.status !== "generating" && (
                <DeleteSpeechButton
                  id={entry.id}
                  title={entry.title || entry.topic}
                  afterDeleteHref={afterDeleteHref}
                  className={smallButton}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} rel="prev" className={smallButton}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-neutral-600">
            Page {page} of {pages}
          </p>
          {page < pages ? (
            <Link href={pageHref(page + 1)} rel="next" className={smallButton}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-neutral-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function pageHref(page: number): string {
  return page > 1 ? `/history?page=${page}` : "/history";
}
