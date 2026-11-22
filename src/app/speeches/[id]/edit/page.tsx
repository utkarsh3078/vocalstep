import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EditSpeechForm } from "@/components/speech/edit-speech-form";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getSpeech } from "@/lib/speech/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit your speech",
  robots: { index: false },
};

export default function EditSpeechPage({ params }: PageProps<"/speeches/[id]/edit">) {
  return (
    <section data-layout="wide" className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-8">
      <Suspense
        fallback={
          <p role="status" className="rounded-card bg-surface p-7 text-muted shadow-card">
            Loading your speech…
          </p>
        }
      >
        <Edit params={params} />
      </Suspense>
    </section>
  );
}

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/speeches/${id}/edit`);

  const supabase = await createClient();
  const speech = await getSpeech(supabase, id);
  if (!speech) notFound();
  if (speech.status !== "ready") redirect(`/speeches/${id}`);

  return (
    <>
      <p>
        <Link
          href={`/speeches/${speech.id}`}
          className="inline-flex items-center gap-1.5 rounded-full py-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to the speech
        </Link>
      </p>
      <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
        Edit your speech. <span className="text-faint">Make it yours.</span>
      </h1>
      <p className="mt-3 text-muted">Topic: {speech.topic}</p>
      <div className="mt-8">
        <EditSpeechForm
          id={speech.id}
          version={speech.version}
          initialTitle={speech.title ?? ""}
          initialContent={speech.content}
          topic={speech.topic}
          wpm={practice.languages[speech.language].wpm}
        />
      </div>
    </>
  );
}
