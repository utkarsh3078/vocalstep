import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Teleprompter } from "@/components/teleprompter/teleprompter";
import { requireUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { getSavedSettings } from "@/lib/profile";
import { getLibrarySpeech } from "@/lib/samples";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Practise a library speech",
  robots: { index: false },
};

export default function LibraryPracticePage({ params }: PageProps<"/library/[slug]/practice">) {
  return (
    // The slug is URL data and the page needs the session, so both are read inside Suspense.
    <Suspense
      fallback={
        <p role="status" className="text-muted">
          Loading the teleprompter…
        </p>
      }
    >
      <LibraryPractice params={params} />
    </Suspense>
  );
}

async function LibraryPractice({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/library/${slug}/practice`);
  const speech = getLibrarySpeech(slug);
  if (!speech) notFound();

  // Tracked like a public sample: by its slug, toward minutes and streaks.
  const target = { sampleSlug: speech.slug };
  const supabase = await createClient();
  const [session, settings] = await Promise.all([
    getOpenSession(supabase, target),
    getSavedSettings(supabase, user.id),
  ]);

  return (
    <Teleprompter
      speechId={`sample:${speech.slug}`}
      title={speech.title}
      blocks={speech.speech.blocks}
      wordCount={speech.speech.wordCount}
      language={speech.language}
      exitHref={`/library/${speech.slug}`}
      tracking={{ target, session }}
      profile={{ settings }}
    />
  );
}
