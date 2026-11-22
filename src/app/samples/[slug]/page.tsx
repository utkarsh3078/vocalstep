import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

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

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft";

export default function SamplePage({ params }: PageProps<"/samples/[slug]">) {
  return (
    <article data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <p>
        <Link
          href="/#samples"
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          All sample speeches
        </Link>
      </p>

      {/* The slug is URL data, so it is read inside Suspense. The three known
          samples are prerendered at build time and never show the fallback. */}
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-6 p-7 text-muted`}>
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
    className: primaryButton,
  };

  return (
    <>
      <header className="mt-6">
        <p className="flex flex-wrap gap-2 text-sm">
          <Chip tone="mint">Sample speech</Chip>
          <Chip>{sample.minutes}-minute speech</Chip>
          <Chip>{practice.languages[sample.language].label}</Chip>
        </p>
        <h1 className="mt-4 max-w-4xl text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
          {sample.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">{sample.summary}</p>
        <p className="mt-2 text-muted">
          {wordCount} words · {speakingTime} at {wpm} words per minute
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* On phones the practice panel comes first, so the main button is near the top. */}
        <aside aria-label="Practise this speech" className="space-y-6 lg:sticky lg:top-6 lg:order-last">
          <div className={`${card} p-6`}>
            <h2 className="text-lg font-semibold tracking-tight">Ready to practise?</h2>
            <p className="mt-1 text-sm text-muted">
              No account needed. The teleprompter starts at {wpm} words per minute.
            </p>
            <div className="mt-5">
              {/* The page itself is static; a signed-in user's saved place streams in. */}
              <Suspense fallback={<PracticeLink {...link} />}>
                <SamplePracticeLink {...link} slug={sample.slug} />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={null}>
            <OwnTopic />
          </Suspense>
        </aside>

        <section aria-label="Speech text" className={`${card} p-6 sm:p-10`}>
          <SpeechContent blocks={blocks} language={sample.language} />
        </section>
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
  className: string;
}) {
  const user = await getCurrentUser();
  const session = user ? await getOpenSession(await createClient(), { sampleSlug: slug }) : undefined;
  return <PracticeLink {...link} session={session} />;
}

/** The next step after a sample: writing a speech on your own topic. */
async function OwnTopic() {
  const user = await getCurrentUser();
  return (
    <div className="rounded-card bg-canvas p-6 ring-1 ring-line">
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-surface">
        <Sparkles className="size-4" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 font-semibold tracking-tight">Speak about your own topic</h2>
      <p className="mt-1 text-sm text-muted">
        {user
          ? "Pick a topic and a length, and we'll write a speech for you."
          : `Create a free account and we'll write ${practice.limits.freeSpeeches} speeches on topics you choose.`}
      </p>
      <Link
        href={user ? "/create" : "/signup"}
        className="mt-4 inline-flex items-center rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-faint"
      >
        {user ? "Create a speech" : "Create a free account"}
      </Link>
    </div>
  );
}

function Chip({ tone, children }: { tone?: "mint"; children: ReactNode }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 ${
        tone === "mint" ? "border-mint-200 bg-mint-50 text-mint-700" : "border-line bg-surface text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
}
