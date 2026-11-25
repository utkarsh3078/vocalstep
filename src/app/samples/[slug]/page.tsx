import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ReadyMadeSpeech } from "@/components/ready-made-speech";
import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
import { getSample } from "@/lib/samples";

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

  return (
    <ReadyMadeSpeech
      sample={sample}
      label="Sample speech"
      practiceHref={`/samples/${sample.slug}/practice`}
      note={`No account needed. The teleprompter starts at ${practice.languages[sample.language].wpm} words per minute.`}
    />
  );
}
