import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateSpeech } from "@/components/create/create-speech";
import { SpeechList } from "@/components/create/speech-list";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getAiEnv } from "@/lib/env/server";
import { getProfileDefaults, getQuotaCounts, listRecentSpeeches } from "@/lib/speech/data";
import { checkQuota } from "@/lib/speech/quota";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Create a speech",
  robots: { index: false },
};

export default function CreatePage({ searchParams }: PageProps<"/create">) {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Create a speech</h1>
      <p className="mt-2 text-neutral-700">
        Choose a topic and a length. We&apos;ll write a speech for you to read aloud.
      </p>
      <Suspense fallback={<p role="status" className="mt-6">Loading…</p>}>
        <Create searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Create({ searchParams }: Pick<PageProps<"/create">, "searchParams">) {
  const params = await searchParams;
  const initialTopic = (firstParam(params.topic) ?? "").slice(0, practice.topic.maxLength);
  const user = await requireUser(initialTopic ? `/create?topic=${encodeURIComponent(initialTopic)}` : "/create");

  const supabase = await createClient();
  const [defaults, counts, speeches] = await Promise.all([
    getProfileDefaults(supabase, user.id),
    getQuotaCounts(supabase),
    listRecentSpeeches(supabase),
  ]);
  const quota = counts ? checkQuota(counts) : null;

  let main;
  if (!getAiEnv()) {
    main = (
      <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
        Writing new speeches isn&apos;t switched on yet. You can still practise the sample speeches.
      </p>
    );
  } else if (!quota) {
    main = (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
        We couldn&apos;t check your free speeches just now. Please refresh the page.
      </p>
    );
  } else if (quota.freeLeft === 0) {
    main = (
      <div className="rounded-md border border-neutral-300 bg-neutral-50 p-4">
        <h2 className="text-xl font-semibold">
          You&apos;ve used your {practice.limits.freeSpeeches} free speeches
        </h2>
        <p className="mt-2 text-neutral-700">
          Paid plans are coming soon. Your speeches below stay yours to practise as often as you like.
        </p>
      </div>
    );
  } else {
    main = (
      <CreateSpeech
        initialTopic={initialTopic}
        defaultLanguage={defaults.language}
        defaultDifficulty={defaults.difficulty}
        freeLeft={quota.freeLeft}
      />
    );
  }

  return (
    <>
      <div className="mt-6">{main}</div>
      <section aria-labelledby="your-speeches" className="mt-12">
        <h2 id="your-speeches" className="text-2xl font-semibold">
          Your speeches
        </h2>
        <div className="mt-4">
          <SpeechList speeches={speeches} timezone={defaults.timezone} />
        </div>
      </section>
    </>
  );
}
