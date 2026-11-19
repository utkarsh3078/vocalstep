import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Teleprompter } from "@/components/teleprompter/teleprompter";
import { samples } from "@/content/samples";
import { getSample } from "@/lib/samples";

export function generateStaticParams() {
  return samples.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/samples/[slug]/practice">): Promise<Metadata> {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) return {};

  // The sample page carries the same text for search engines.
  return { title: `Practise: ${sample.title}`, robots: { index: false } };
}

export default function SamplePracticePage({ params }: PageProps<"/samples/[slug]/practice">) {
  return (
    // The slug is URL data, so it is read inside Suspense.
    <Suspense
      fallback={
        <p role="status" className="text-neutral-600">
          Loading the teleprompter…
        </p>
      }
    >
      <SamplePractice params={params} />
    </Suspense>
  );
}

async function SamplePractice({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) notFound();

  return (
    <Teleprompter
      speechId={`sample:${sample.slug}`}
      title={sample.title}
      blocks={sample.speech.blocks}
      wordCount={sample.speech.wordCount}
      language={sample.language}
      exitHref={`/samples/${sample.slug}`}
    />
  );
}
