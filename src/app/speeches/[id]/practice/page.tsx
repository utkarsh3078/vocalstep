import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Teleprompter } from "@/components/teleprompter/teleprompter";
import { requireUser } from "@/lib/auth/session";
import { getOpenSession } from "@/lib/practice/data";
import { parseSpeech } from "@/lib/speech/blocks";
import { getSpeech } from "@/lib/speech/data";
import { createClient } from "@/lib/supabase/server";
import { getSavedSettings } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Practise your speech",
  robots: { index: false },
};

export default function SpeechPracticePage({ params }: PageProps<"/speeches/[id]/practice">) {
  return (
    <Suspense fallback={<p role="status" className="text-muted">Loading the teleprompter…</p>}>
      <Practice params={params} />
    </Suspense>
  );
}

async function Practice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/speeches/${id}/practice`);

  const supabase = await createClient();
  const speech = await getSpeech(supabase, id);
  if (!speech) notFound();
  if (speech.status !== "ready") redirect(`/speeches/${id}`);

  const { blocks, wordCount } = parseSpeech(speech.content);
  const target = { speechId: speech.id };
  const [session, settings] = await Promise.all([
    getOpenSession(supabase, target, speech.version),
    getSavedSettings(supabase, user.id),
  ]);

  return (
    <Teleprompter
      // The version is part of the key: after an edit, practice starts again
      // from the beginning instead of jumping to an old position.
      speechId={`speech:${speech.id}:v${speech.version}`}
      title={speech.title || speech.topic}
      blocks={blocks}
      wordCount={wordCount}
      language={speech.language}
      exitHref={`/speeches/${speech.id}`}
      tracking={{ target, session }}
      profile={{ settings }}
    />
  );
}
