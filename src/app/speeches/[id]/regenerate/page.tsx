import { Archive, ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

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
    <section data-layout="wide" className="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
      <Suspense
        fallback={
          <p role="status" className="rounded-card bg-surface p-7 text-muted shadow-card">
            Loading your speech…
          </p>
        }
      >
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

  const notice = (tone: "peach" | "red", text: ReactNode, role: "status" | "alert" = "status") => (
    <p
      role={role}
      className={`rounded-2xl border px-4 py-3 ${
        tone === "red" ? "border-danger-200 bg-danger-50 text-danger-800" : "border-peach-200 bg-peach-50 text-peach-700"
      }`}
    >
      {text}
    </p>
  );

  let main;
  if (!isOfferedLanguage(speech.language)) {
    main = notice(
      "peach",
      <>
        New speeches in {languageLabel} can&apos;t be written right now. This speech stays yours to practise
        as often as you like.
      </>,
    );
  } else if (!(practice.durations as readonly number[]).includes(speech.targetMinutes)) {
    main = notice(
      "peach",
      <>
        New {speech.targetMinutes}-minute speeches can&apos;t be written right now. This speech stays yours to
        practise as often as you like.
      </>,
    );
  } else if (!getAiEnv()) {
    main = notice("peach", <>Writing new speeches isn&apos;t switched on yet.</>);
  } else if (!quota) {
    main = notice("red", <>We couldn&apos;t check your free speeches just now. Please refresh the page.</>, "alert");
  } else if (!quota.ok) {
    main = (
      <div className="rounded-2xl bg-canvas p-5">
        <p className="font-medium">{generationErrorMessage(quota.code)}</p>
        {quota.code === "free_used" && (
          <p className="mt-1 text-muted">
            Paid plans are coming soon. This speech stays yours to practise as often as you like.
          </p>
        )}
      </div>
    );
  } else {
    main = (
      <>
        <p className="text-muted">
          This uses 1 of your free speeches:{" "}
          <span className="font-medium text-ink">
            {quota.freeLeft === 1 ? "1 is left." : `${quota.freeLeft} are left.`}
          </span>{" "}
          If it can&apos;t be written, it doesn&apos;t count.
        </p>
        <div className="mt-6">
          <RegenerateSpeech speechId={speech.id} language={speech.language} />
        </div>
      </>
    );
  }

  const keptOrRemoved =
    practised === false
      ? {
          icon: Trash2,
          text: "You haven't practised this speech, so it will be removed once the new one is ready.",
        }
      : {
          icon: Archive,
          text: "You've practised this speech, so it stays in your history next to the new one.",
        };

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
        Regenerate this speech. <span className="text-faint">Same settings, new words.</span>
      </h1>
      <p className="mt-3 text-muted">We&apos;ll write a new speech with the same settings.</p>

      <div className="mt-8 rounded-card bg-surface p-6 shadow-card sm:p-8">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-canvas px-4 py-3 sm:col-span-3">
            <dt className="text-sm text-muted">Topic</dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight">{speech.topic}</dd>
          </div>
          <Setting label="Length" value={`${speech.targetMinutes} minutes`} />
          <Setting label="Language" value={languageLabel} />
          <Setting label="Difficulty" value={difficultyLabel} />
        </dl>

        <p className="mt-6 flex items-start gap-3 text-ink-soft">
          <keptOrRemoved.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" strokeWidth={1.75} />
          {keptOrRemoved.text}
        </p>

        <div className="mt-6 border-t border-line pt-6">{main}</div>
      </div>
    </>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
