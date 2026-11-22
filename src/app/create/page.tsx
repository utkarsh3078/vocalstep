import { ArrowRight, BookOpen, Gift, Hourglass, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { CreateSpeech } from "@/components/create/create-speech";
import { SpeechList } from "@/components/create/speech-list";
import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
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

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";

export default function CreatePage({ searchParams }: PageProps<"/create">) {
  return (
    <section data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
        Create a speech. <span className="text-faint">Pick a topic and a length.</span>
      </h1>
      <p className="mt-3 text-muted">We&apos;ll write a speech for you to read aloud.</p>
      <Suspense
        fallback={
          <p role="status" className={`${card} mt-8 p-7 text-muted`}>
            Loading…
          </p>
        }
      >
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
    listRecentSpeeches(supabase, 5),
  ]);
  const quota = counts ? checkQuota(counts) : null;

  let main;
  if (!getAiEnv()) {
    main = (
      <Notice icon={Hourglass} title="Writing new speeches isn't switched on yet">
        You can still practise the{" "}
        <Link href="/#samples" className="font-medium text-ink underline underline-offset-4">
          sample speeches
        </Link>
        .
      </Notice>
    );
  } else if (!quota) {
    main = (
      <p role="alert" className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-danger-800">
        We couldn&apos;t check your free speeches just now. Please refresh the page.
      </p>
    );
  } else if (quota.freeLeft === 0) {
    main = (
      <Notice icon={Gift} title={`You've used your ${practice.limits.freeSpeeches} free speeches`}>
        Paid plans are coming soon. Your speeches stay yours to practise as often as you like.
        <span className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft"
          >
            Your speeches
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          {samples[0] && (
            <Link
              href={`/samples/${samples[0].slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 font-medium transition-colors hover:border-faint"
            >
              <BookOpen aria-hidden="true" className="size-4" />
              Practise a sample
            </Link>
          )}
        </span>
      </Notice>
    );
  } else {
    main = (
      <CreateSpeech
        initialTopic={initialTopic}
        defaultLanguage={defaults.language}
        defaultDifficulty={defaults.difficulty}
      />
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div>{main}</div>

      <div className="space-y-6">
        {quota && <FreeSpeeches used={practice.limits.freeSpeeches - quota.freeLeft} />}

        <section aria-labelledby="your-speeches" className={`${card} p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="your-speeches" className="text-lg font-semibold tracking-tight">
              Your speeches
            </h2>
            {speeches && speeches.length > 0 && (
              <Link
                href="/history"
                className="inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                All your speeches
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            )}
          </div>
          <div className="mt-4">
            <SpeechList speeches={speeches} timezone={defaults.timezone} />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Free speeches as dots: filled for used, open for left. */
function FreeSpeeches({ used }: { used: number }) {
  const total = practice.limits.freeSpeeches;
  const left = Math.max(0, total - used);
  return (
    <section aria-labelledby="free-speeches" className={`${card} p-6`}>
      <h2 id="free-speeches" className="text-sm font-medium text-muted">
        Free speeches
      </h2>
      <p className="mt-1">
        <span className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">{left}</span>{" "}
        <span className="text-muted">of {total} left</span>
      </p>
      <div aria-hidden="true" className="mt-4 flex gap-2">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full ${index < used ? "bg-ink" : "bg-mint-400"}`}
          />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        Practising is always free. Refused topics and failed attempts don&apos;t use one up.
      </p>
    </section>
  );
}

function Notice({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className={`${card} p-7 sm:p-10`}>
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-well">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-xl text-muted">{children}</p>
    </section>
  );
}
