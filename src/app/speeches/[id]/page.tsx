import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SpeechContent } from "@/components/speech-content";
import { DeleteSpeechButton } from "@/components/speech/delete-speech-button";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { parseSpeech } from "@/lib/speech/blocks";
import { getSpeech } from "@/lib/speech/data";
import { formatSpeakingTime, speakingSeconds } from "@/lib/speech/targets";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your speech",
  robots: { index: false },
};

const secondaryButton =
  "inline-block rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100";

/** Shown after coming back from Edit or Regenerate. */
const NOTICES: Record<string, string> = {
  saved: "Your changes are saved.",
  replaced: "Here's your new speech. The old one wasn't practised, so it has been removed.",
  kept: "Here's your new speech. The old one is still in your history, with its practice.",
};

export default function SpeechPage({ params, searchParams }: PageProps<"/speeches/[id]">) {
  return (
    <article>
      <p>
        <Link href="/history" className="text-sm underline underline-offset-4">
          ← Your speeches
        </Link>
      </p>
      <Suspense fallback={<p role="status" className="mt-4">Loading your speech…</p>}>
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

  if (speech.status !== "ready") {
    const writing = speech.status === "generating";
    return (
      <>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{heading}</h1>
        <div
          role="status"
          className="mt-6 rounded-md border border-neutral-300 bg-neutral-50 p-4"
        >
          {writing ? (
            <p>
              This speech is still being written. Please refresh the page in a moment.
            </p>
          ) : (
            <>
              <p>
                We couldn&apos;t write this speech. Try rephrasing this topic. This didn&apos;t use up a
                free speech.
              </p>
              <Link
                href={`/create?topic=${encodeURIComponent(speech.topic)}`}
                className="mt-3 inline-block underline underline-offset-4"
              >
                Try again with this topic
              </Link>
            </>
          )}
        </div>
        {!writing && (
          <div className="mt-6">
            <DeleteSpeechButton
              id={speech.id}
              title={heading}
              afterDeleteHref="/history?deleted=1"
              className={secondaryButton}
            />
          </div>
        )}
      </>
    );
  }

  const { blocks, wordCount } = parseSpeech(speech.content);
  const { wpm } = practice.languages[speech.language];
  const speakingTime = formatSpeakingTime(speakingSeconds(wordCount, wpm));
  const session = await getOpenSession(supabase, { speechId: speech.id }, speech.version);

  return (
    <>
      {notice && (
        <p role="status" className="mt-4 rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
          {notice}
        </p>
      )}
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{heading}</h1>
      <p className="mt-2 text-neutral-600">
        {wordCount} words · {speakingTime} at {wpm} words per minute
      </p>
      <p className="mt-1 text-sm text-neutral-600">AI-generated. May contain mistakes.</p>

      <div className="mt-6 flex flex-wrap items-start gap-3">
        <PracticeLink
          speechId={`speech:${speech.id}:v${speech.version}`}
          wordCount={wordCount}
          href={`/speeches/${speech.id}/practice`}
          session={session}
        />
        <Link href={`/speeches/${speech.id}/edit`} className={secondaryButton}>
          Edit
        </Link>
        <Link href={`/speeches/${speech.id}/regenerate`} className={secondaryButton}>
          Regenerate
        </Link>
        <DeleteSpeechButton
          id={speech.id}
          title={heading}
          afterDeleteHref="/history?deleted=1"
          className={secondaryButton}
        />
      </div>

      <div className="mt-8">
        <SpeechContent blocks={blocks} language={speech.language} />
      </div>
    </>
  );
}
