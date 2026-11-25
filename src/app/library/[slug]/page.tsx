import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ReadyMadeSpeech } from "@/components/ready-made-speech";
import { libraryCategories } from "@/content/library";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getLibrarySpeech } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Library speech",
  robots: { index: false },
};

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";

export default function LibrarySpeechPage({ params }: PageProps<"/library/[slug]">) {
  return (
    <article data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <p>
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Speech library
        </Link>
      </p>

      {/* For signed-in users only, so the slug and the session are read inside Suspense. */}
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-6 p-7 text-muted`}>
            Loading speech…
          </p>
        }
      >
        <LibrarySpeechView params={params} />
      </Suspense>
    </article>
  );
}

async function LibrarySpeechView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/library/${slug}`);
  const speech = getLibrarySpeech(slug);
  if (!speech) notFound();

  return (
    <ReadyMadeSpeech
      sample={speech}
      label={libraryCategories[speech.category]}
      practiceHref={`/library/${speech.slug}/practice`}
      note={`Free to practise as often as you like. The teleprompter starts at ${practice.languages[speech.language].wpm} words per minute.`}
    />
  );
}
