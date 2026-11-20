import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SpeechContent } from "@/components/speech-content";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
import { getCurrentUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { getSample } from "@/lib/samples";
import { formatSpeakingTime, speakingSeconds } from "@/lib/speech/targets";
import { createClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return samples.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/samples/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) return {};

  return { title: sample.title, description: sample.summary };
}

export default function SamplePage({ params }: PageProps<"/samples/[slug]">) {
  return (
    <article>
      <p>
        <Link href="/#samples" className="text-sm underline underline-offset-4">
          ← All sample speeches
        </Link>
      </p>

      {/* The slug is URL data, so it is read inside Suspense. The three known
          samples are prerendered at build time and never show the fallback. */}
      <Suspense
        fallback={
          <p role="status" className="mt-4 text-neutral-600">
            Loading speech…
          </p>
        }
      >
        <SampleSpeech params={params} />
      </Suspense>
    </article>
  );
}

async function SampleSpeech({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) notFound();

  const { wpm } = practice.languages[sample.language];
  const { blocks, wordCount } = sample.speech;
  const speakingTime = formatSpeakingTime(speakingSeconds(wordCount, wpm));
  const link = {
    speechId: `sample:${sample.slug}`,
    wordCount,
    href: `/samples/${sample.slug}/practice`,
  };

  return (
    <>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{sample.title}</h1>
      <p className="mt-2 text-neutral-600">
        {wordCount} words · {speakingTime} at {wpm} words per minute
      </p>

      <div className="mt-6">
        {/* The page itself is static; a signed-in user's saved place streams in. */}
        <Suspense fallback={<PracticeLink {...link} />}>
          <SamplePracticeLink {...link} slug={sample.slug} />
        </Suspense>
      </div>

      <div className="mt-8">
        <SpeechContent blocks={blocks} language={sample.language} />
      </div>
    </>
  );
}

/** The practice button, including a signed-in user's unfinished session on this sample. */
async function SamplePracticeLink({
  slug,
  ...link
}: {
  slug: string;
  speechId: string;
  wordCount: number;
  href: string;
}) {
  const user = await getCurrentUser();
  const session = user ? await getOpenSession(await createClient(), { sampleSlug: slug }) : undefined;
  return <PracticeLink {...link} session={session} />;
}
