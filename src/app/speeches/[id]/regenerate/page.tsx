import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RegenerateSpeech } from "@/components/speech/regenerate-speech";
import { isOfferedLanguage, practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getAiEnv } from "@/lib/env/server";
import { getQuotaCounts, getSpeech, wasPractised } from "@/lib/speech/data";
import { generationErrorMessage } from "@/lib/speech/messages";
import { checkQuota } from "@/lib/speech/quota";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Regenerate your speech",
  robots: { index: false },
};

export default function RegenerateSpeechPage({ params }: PageProps<"/speeches/[id]/regenerate">) {
  return (
    <section>
      <Suspense fallback={<p role="status">Loading your speech…</p>}>
        <Regenerate params={params} />
      </Suspense>
    </section>
  );
}

async function Regenerate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/speeches/${id}/regenerate`);

  const supabase = await createClient();
  const speech = await getSpeech(supabase, id);
  if (!speech) notFound();
  if (speech.status !== "ready") redirect(`/speeches/${id}`);

  const [counts, practised] = await Promise.all([getQuotaCounts(supabase), wasPractised(supabase, id)]);
  const quota = counts ? checkQuota(counts) : null;
  const languageLabel = practice.languages[speech.language].label;
  const difficultyLabel = Object.hasOwn(practice.difficulties, speech.difficulty)
    ? practice.difficulties[speech.difficulty as keyof typeof practice.difficulties].label
    : speech.difficulty;

  let main;
  if (!isOfferedLanguage(speech.language)) {
    main = (
      <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
        New speeches in {languageLabel} can&apos;t be written right now. This speech stays yours to
        practise as often as you like.
      </p>
    );
  } else if (!getAiEnv()) {
    main = (
      <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
        Writing new speeches isn&apos;t switched on yet.
      </p>
    );
  } else if (!quota) {
    main = (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
        We couldn&apos;t check your free speeches just now. Please refresh the page.
      </p>
    );
  } else if (!quota.ok) {
    main = (
      <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
        <p>{generationErrorMessage(quota.code)}</p>
        {quota.code === "free_used" && (
          <p className="mt-2 text-neutral-700">
            Paid plans are coming soon. This speech stays yours to practise as often as you like.
          </p>
        )}
      </div>
    );
  } else {
    main = (
      <>
        <p className="text-neutral-700">
          This uses 1 of your free speeches:{" "}
          {quota.freeLeft === 1 ? "1 is left." : `${quota.freeLeft} are left.`} If it can&apos;t be written,
          it doesn&apos;t count.
        </p>
        <div className="mt-6">
          <RegenerateSpeech speechId={speech.id} language={speech.language} />
        </div>
      </>
    );
  }

  return (
    <>
      <p>
        <Link href={`/speeches/${speech.id}`} className="text-sm underline underline-offset-4">
          ← Back to the speech
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Regenerate this speech</h1>
      <p className="mt-2 text-neutral-700">
        We&apos;ll write a new speech with the same settings.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-sm text-neutral-600">Topic</dt>
          <dd>{speech.topic}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Length</dt>
          <dd>{speech.targetMinutes} minutes</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Language</dt>
          <dd>{languageLabel}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Difficulty</dt>
          <dd>{difficultyLabel}</dd>
        </div>
      </dl>
      <p className="mt-4 text-neutral-700">
        {practised === false
          ? "You haven't practised this speech, so it will be removed once the new one is ready."
          : "You've practised this speech, so it stays in your history next to the new one."}
      </p>
      <div className="mt-6">{main}</div>
    </>
  );
}
