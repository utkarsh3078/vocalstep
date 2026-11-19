import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SpeechContent } from "@/components/speech-content";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { parseSpeech } from "@/lib/speech/blocks";
import { getSpeech } from "@/lib/speech/data";
import { formatSpeakingTime, speakingSeconds } from "@/lib/speech/targets";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your speech",
  robots: { index: false },
};

export default function SpeechPage({ params }: PageProps<"/speeches/[id]">) {
  return (
    <article>
      <p>
        <Link href="/create" className="text-sm underline underline-offset-4">
          ← Create and your speeches
        </Link>
      </p>
      <Suspense fallback={<p role="status" className="mt-4">Loading your speech…</p>}>
        <Speech params={params} />
      </Suspense>
    </article>
  );
}

async function Speech({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/speeches/${id}`);

  const supabase = await createClient();
  const speech = await getSpeech(supabase, id);
  if (!speech) notFound();

  const heading = speech.title || speech.topic;

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
      </>
    );
  }

  const { blocks, wordCount } = parseSpeech(speech.content);
  const { wpm } = practice.languages[speech.language];
  const speakingTime = formatSpeakingTime(speakingSeconds(wordCount, wpm));

  return (
    <>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{heading}</h1>
      <p className="mt-2 text-neutral-600">
        {wordCount} words · {speakingTime} at {wpm} words per minute
      </p>
      <p className="mt-1 text-sm text-neutral-600">AI-generated. May contain mistakes.</p>

      <div className="mt-6">
        <PracticeLink
          speechId={`speech:${speech.id}:v${speech.version}`}
          wordCount={wordCount}
          href={`/speeches/${speech.id}/practice`}
        />
      </div>

      <div className="mt-8">
        <SpeechContent blocks={blocks} language={speech.language} />
      </div>
    </>
  );
}
