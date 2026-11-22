import { ArrowLeft, Check, FileText, Hourglass, PenLine, RefreshCw, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { SpeechContent } from "@/components/speech-content";
import { DeleteSpeechButton } from "@/components/speech/delete-speech-button";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { parseSpeech } from "@/lib/speech/blocks";
import { getSpeech, type Speech as SpeechData } from "@/lib/speech/data";
import { formatSpeakingTime, speakingSeconds } from "@/lib/speech/targets";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your speech",
  robots: { index: false },
};

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft";
const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-faint";
const quietButton =
  "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-danger-50 hover:text-danger-700";

/** Shown after coming back from Edit or Regenerate. */
const NOTICES: Record<string, string> = {
  saved: "Your changes are saved.",
  replaced: "Here's your new speech. The old one wasn't practised, so it has been removed.",
  kept: "Here's your new speech. The old one is still in your history, with its practice.",
};

export default function SpeechPage({ params, searchParams }: PageProps<"/speeches/[id]">) {
  return (
    <article data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <p>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Your speeches
        </Link>
      </p>
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-6 p-7 text-muted`}>
            Loading your speech…
          </p>
        }
      >
        <Speech params={params} searchParams={searchParams} />
      </Suspense>
    </article>
  );
}

async function Speech({
  params,
  searchParams,
}: Pick<PageProps<"/speeches/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const query = await searchParams;
  await requireUser(`/speeches/${id}`);

  const supabase = await createClient();
  const speech = await getSpeech(supabase, id);
  if (!speech) notFound();

  const heading = speech.title || speech.topic;
  const noticeKey = firstParam(query.saved) === "1" ? "saved" : firstParam(query.regenerated);
  const notice = noticeKey && Object.hasOwn(NOTICES, noticeKey) ? NOTICES[noticeKey] : null;

  if (speech.status !== "ready") return <NotReady speech={speech} heading={heading} />;

  const { blocks, wordCount } = parseSpeech(speech.content);
  const { wpm } = practice.languages[speech.language];
  const speakingTime = formatSpeakingTime(speakingSeconds(wordCount, wpm));
  const session = await getOpenSession(supabase, { speechId: speech.id }, speech.version);

  return (
    <>
      {notice && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-2xl border border-mint-200 bg-mint-50 px-4 py-3 text-mint-700"
        >
          <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
          {notice}
        </p>
      )}

      <header className="mt-6">
        <SettingsChips speech={speech} />
        <h1 className="mt-4 max-w-4xl text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
          {heading}
        </h1>
        <p className="mt-3 text-muted">
          {wordCount} words · {speakingTime} at {wpm} words per minute
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* On phones the practice panel comes first, so the main button is near the top. */}
        <aside aria-label="Practise this speech" className={`${card} p-6 lg:sticky lg:top-6 lg:order-last`}>
          <h2 className="text-lg font-semibold tracking-tight">Ready to practise?</h2>
          <p className="mt-1 text-sm text-muted">
            The teleprompter starts at {wpm} words per minute. Change the speed any time.
          </p>
          <div className="mt-5">
            <PracticeLink
              speechId={`speech:${speech.id}:v${speech.version}`}
              wordCount={wordCount}
              href={`/speeches/${speech.id}/practice`}
              session={session}
              className={primaryButton}
            />
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/speeches/${speech.id}/edit`} className={secondaryButton}>
                <PenLine aria-hidden="true" className="size-3.5" />
                Edit
              </Link>
              <Link href={`/speeches/${speech.id}/regenerate`} className={secondaryButton}>
                <RefreshCw aria-hidden="true" className="size-3.5" />
                Regenerate
              </Link>
            </div>
            <div className="mt-2">
              <DeleteSpeechButton
                id={speech.id}
                title={heading}
                afterDeleteHref="/history?deleted=1"
                className={quietButton}
              />
            </div>
          </div>
        </aside>

        <section aria-label="Speech text" className={`${card} p-6 sm:p-10`}>
          <SpeechContent blocks={blocks} language={speech.language} />
          <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
            AI-generated. May contain mistakes.
          </p>
        </section>
      </div>
    </>
  );
}

/** The speech's settings: length, difficulty and language. */
function SettingsChips({ speech }: { speech: SpeechData }) {
  const difficulty = Object.hasOwn(practice.difficulties, speech.difficulty)
    ? practice.difficulties[speech.difficulty as keyof typeof practice.difficulties].label
    : speech.difficulty;
  return (
    <p className="flex flex-wrap gap-2 text-sm">
      <Chip>{speech.targetMinutes}-minute speech</Chip>
      <Chip>{difficulty}</Chip>
      <Chip>{practice.languages[speech.language].label}</Chip>
    </p>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-line bg-surface px-3 py-1 text-ink-soft">{children}</span>;
}

/** A speech still being written, or one that couldn't be written. */
function NotReady({ speech, heading }: { speech: SpeechData; heading: string }) {
  const writing = speech.status === "generating";
  const Icon: LucideIcon = writing ? Hourglass : FileText;

  return (
    <section className={`${card} mt-6 p-7 sm:p-10`}>
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-well">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-6">
        {writing ? (
          <span className="rounded-lg border border-line bg-canvas px-2 py-0.5 text-sm font-medium text-ink-soft">
            Being written
          </span>
        ) : (
          <span className="rounded-lg border border-danger-200 bg-danger-50 px-2 py-0.5 text-sm font-medium text-danger-800">
            Couldn&apos;t be written
          </span>
        )}
      </p>
      <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.03em]">{heading}</h1>

      {writing ? (
        <p role="status" className="mt-3 max-w-xl text-muted">
          This speech is still being written. Please refresh the page in a moment.
        </p>
      ) : (
        <>
          <p role="status" className="mt-3 max-w-xl text-muted">
            We couldn&apos;t write this speech. Try rephrasing this topic. This didn&apos;t use up a free
            speech.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`/create?topic=${encodeURIComponent(speech.topic)}`}
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft"
            >
              Try again with this topic
            </Link>
            <DeleteSpeechButton
              id={speech.id}
              title={heading}
              afterDeleteHref="/history?deleted=1"
              className="inline-flex items-center justify-center rounded-full px-4 py-3 font-medium text-muted transition-colors hover:bg-danger-50 hover:text-danger-700"
            />
          </div>
        </>
      )}
    </section>
  );
}
