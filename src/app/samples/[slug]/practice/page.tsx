import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Teleprompter, type TeleprompterProps } from "@/components/teleprompter/teleprompter";
import { samples } from "@/content/samples";
import { getCurrentUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { getSample } from "@/lib/samples";
import { createClient } from "@/lib/supabase/server";
import { getSavedSettings } from "@/lib/teleprompter/profile";

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
        <p role="status" className="text-muted">
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

  // Signed-in users' practice on samples counts toward their minutes and streak.
  const user = await getCurrentUser();
  const target = { sampleSlug: sample.slug };
  let tracking: TeleprompterProps["tracking"];
  let profile: TeleprompterProps["profile"];
  if (user) {
    const supabase = await createClient();
    const [session, settings] = await Promise.all([
      getOpenSession(supabase, target),
      getSavedSettings(supabase, user.id),
    ]);
    tracking = { target, session };
    profile = { settings };
  }

  return (
    <Teleprompter
      speechId={`sample:${sample.slug}`}
      title={sample.title}
      blocks={sample.speech.blocks}
      wordCount={sample.speech.wordCount}
      language={sample.language}
      exitHref={`/samples/${sample.slug}`}
      tracking={tracking}
      profile={profile}
    />
  );
}
