import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Library, Mic, Plus, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { DeleteSpeechButton } from "@/components/speech/delete-speech-button";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { librarySpeeches } from "@/content/library";
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

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3 font-medium transition-colors hover:border-faint";
const smallPrimary =
  "inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium whitespace-nowrap text-on-ink transition-colors hover:bg-ink-soft";
const smallSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:border-faint";
const smallQuiet =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-danger-50 hover:text-danger-700";

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <div data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <Suspense
        fallback={
          <p role="status" className={`${card} p-7 text-muted`}>
            Loading your speeches…
          </p>
        }
      >
        <History searchParams={searchParams} />
      </Suspense>
    </div>
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

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
          Your speeches. <span className="text-faint">Read, practise or tidy up.</span>
        </h1>
        {history && history.total > 0 && (
          <p className="mt-3 text-sm text-muted">
            {history.total === 1 ? "1 speech" : `${history.total} speeches`}
          </p>
        )}
      </div>
      <Link href="/create" className={primaryButton}>
        <Plus aria-hidden="true" className="size-4" />
        Create a speech
      </Link>
    </header>
  );
  const libraryCard = <LibraryCard />;

  const deletedNotice = deleted && (
    <p
      role="status"
      className="mt-6 flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-50 px-4 py-3 text-mint-700"
    >
      <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
      The speech has been deleted. Your practice minutes and streak are kept.
    </p>
  );

  if (!history) {
    return (
      <>
        {header}
        {libraryCard}
        <p role="alert" className="mt-8 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-danger-800">
          We couldn&apos;t load your speeches just now. Please refresh the page.
        </p>
      </>
    );
  }

  const pages = pageCount(history.total, practice.lists.historyPageSize);

  if (history.total === 0) {
    return (
      <>
        {header}
        {deletedNotice}
        <EmptyState />
        {libraryCard}
      </>
    );
  }

  if (history.entries.length === 0) {
    return (
      <>
        {header}
        {deletedNotice}
        {libraryCard}
        <p className={`${card} mt-8 p-7 text-muted`}>
          There&apos;s nothing on this page.{" "}
          <Link href={pageHref(pages)} className="font-medium text-ink underline underline-offset-4">
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
      {header}
      {deletedNotice}
      {libraryCard}

      <section aria-label="Speeches" className={`${card} mt-8 px-5 sm:px-7`}>
        <ul className="divide-y divide-line">
          {history.entries.map((entry) => (
            <SpeechRow key={entry.id} entry={entry} date={date} afterDeleteHref={afterDeleteHref} />
          ))}
        </ul>
      </section>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} rel="prev" className={smallSecondary}>
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Page {page} of {pages}
          </p>
          {page < pages ? (
            <Link href={pageHref(page + 1)} rel="next" className={smallSecondary}>
              Older
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

function SpeechRow({
  entry,
  date,
  afterDeleteHref,
}: {
  entry: HistoryEntry;
  date: Intl.DateTimeFormat;
  afterDeleteHref: string;
}) {
  const title = entry.title || entry.topic;
  const ready = entry.status === "ready";
  const open = entry.practice.openProgress;

  return (
    <li className="py-5">
      <div className="flex gap-4">
        {/* Hidden on phones, where the width is better spent on the title and buttons. */}
        <IconWell icon={ready ? Mic : FileText} className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              href={`/speeches/${entry.id}`}
              className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
            >
              {title}
            </Link>
            <StatusPill entry={entry} />
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Detail label="Length" value={`${entry.targetMinutes} min`} />
            {ready && <Detail label="Words" value={String(entry.wordCount)} />}
            <Detail label="Created" value={date.format(new Date(entry.createdAt))} />
            {ready && (
              <>
                <Detail
                  label="Last practised"
                  value={entry.practice.lastPractisedAt ? date.format(new Date(entry.practice.lastPractisedAt)) : "Not yet"}
                />
                <Detail label="Time spent" value={formatPracticeTime(entry.practice.activeSeconds)} />
              </>
            )}
          </dl>

          {open !== null && (
            <div aria-hidden="true" className="mt-3 h-1 max-w-56 overflow-hidden rounded-full bg-well">
              <div className="h-full rounded-full bg-mint-700" style={{ width: `${open * 100}%` }} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ready && (
              <PracticeLink
                speechId={`speech:${entry.id}:v${entry.version}`}
                wordCount={entry.wordCount}
                href={`/speeches/${entry.id}/practice`}
                session={entry.practice.open}
                startLabel={entry.practice.lastPractisedAt ? "Practise again" : "Practise"}
                className={smallPrimary}
              />
            )}
            <Link href={`/speeches/${entry.id}`} className={smallSecondary}>
              Read
            </Link>
            {entry.status !== "generating" && (
              <DeleteSpeechButton id={entry.id} title={title} afterDeleteHref={afterDeleteHref} className={smallQuiet} />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/** The speech's state at a glance: how it was practised, or why it can't be yet. */
function StatusPill({ entry }: { entry: HistoryEntry }) {
  if (entry.status === "generating") return <Pill tone="neutral">Being written</Pill>;
  if (entry.status === "failed") return <Pill tone="red">Couldn&apos;t be written</Pill>;

  const label = practiceStatusLabel(entry.practice);
  if (entry.practice.openProgress !== null) return <Pill tone="peach">{label}</Pill>;
  if (entry.practice.timesCompleted > 0) {
    return (
      <Pill tone="mint">
        <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        {label}
      </Pill>
    );
  }
  return <Pill tone="neutral">{label}</Pill>;
}

function Pill({ tone, children }: { tone: "mint" | "peach" | "neutral" | "red"; children: ReactNode }) {
  const tones = {
    mint: "border-mint-200 bg-mint-50 text-mint-700",
    peach: "border-peach-200 bg-peach-50 text-peach-700",
    neutral: "border-line bg-canvas text-ink-soft",
    red: "border-danger-200 bg-danger-50 text-danger-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink-soft">{value}</dd>
    </div>
  );
}

function IconWell({ icon: Icon, className = "flex" }: { icon: LucideIcon; className?: string }) {
  return (
    <span aria-hidden="true" className={`${className} size-11 shrink-0 items-center justify-center rounded-full bg-well`}>
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

function EmptyState() {
  return (
    <section className={`${card} mt-8 p-8 sm:p-12`}>
      <IconWell icon={Mic} />
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">You haven&apos;t created any speeches yet.</h2>
      <p className="mt-2 max-w-xl text-muted">
        Pick a topic and a length, and we&apos;ll write a speech for you to read aloud. You can
        practise a ready-made speech from the library while you decide.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/create" className={primaryButton}>
          <Plus aria-hidden="true" className="size-4" />
          Create your first speech
        </Link>
        <Link href="/library" className={secondaryButton}>
          <BookOpen aria-hidden="true" className="size-4" />
          Browse the library
        </Link>
      </div>
    </section>
  );
}

/** The way into the speech library, shown above the user's own speeches. */
function LibraryCard() {
  return (
    <section
      aria-labelledby="library-card"
      className="mt-8 flex flex-col gap-4 rounded-card bg-canvas p-6 ring-1 ring-line sm:flex-row sm:items-center"
    >
      <IconWell icon={Library} />
      <div className="flex-1">
        <h2 id="library-card" className="font-semibold tracking-tight">
          Speech library
        </h2>
        <p className="mt-1 text-sm text-muted">
          {librarySpeeches.length} ready-made speeches on study, space, AI and more. Free to practise, as often as
          you like.
        </p>
      </div>
      <Link href="/library" className={secondaryButton}>
        Browse the library
      </Link>
    </section>
  );
}

function pageHref(page: number): string {
  return page > 1 ? `/history?page=${page}` : "/history";
}
