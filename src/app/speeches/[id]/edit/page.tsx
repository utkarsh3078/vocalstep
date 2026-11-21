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
    <section>
      <Suspense fallback={<p role="status">Loading your speech…</p>}>
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
        <Link href={`/speeches/${speech.id}`} className="text-sm underline underline-offset-4">
          ← Back to the speech
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Edit your speech</h1>
      <p className="mt-2 text-neutral-700">Topic: {speech.topic}</p>
      <div className="mt-6">
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
