import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PracticeStatsList } from "@/components/practice/practice-stats";
import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
import { requireUser } from "@/lib/auth/session";
import { getPracticeStats, listRecentPractice, type RecentPractice } from "@/lib/practice/data";
import { sessionStatusLabel } from "@/lib/practice/history";
import { formatClock } from "@/lib/teleprompter/timing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

const smallButton =
  "inline-block rounded-md border border-neutral-400 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100";

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <Suspense fallback={<p role="status" className="mt-6">Loading your dashboard…</p>}>
        <Dashboard />
      </Suspense>
      <SuggestedTopics />
    </section>
  );
}

async function Dashboard() {
  const user = await requireUser("/dashboard");

  const supabase = await createClient();
  const [{ data: profile, error }, stats, recent] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone").eq("id", user.id).maybeSingle(),
    getPracticeStats(supabase, user.id),
    listRecentPractice(supabase),
  ]);
  // The name is only a greeting; without it the page still works.
  if (error) console.error("Could not load the profile:", error.code, error.message);
  const name = profile?.full_name?.trim();

  return (
    <>
      <p className="mt-2 text-lg text-neutral-700">
        {name ? `Welcome back, ${name}.` : "Welcome back."} Ready to speak today?
      </p>
      <p className="mt-6">
        <Link
          href="/create"
          className="inline-block rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700"
        >
          Start New Practice
        </Link>
      </p>

      <section aria-labelledby="your-practice" className="mt-10">
        <h2 id="your-practice" className="text-2xl font-semibold">
          Your practice
        </h2>
        <div className="mt-4">
          <PracticeStatsList stats={stats} />
        </div>
      </section>

      <section aria-labelledby="recent-practice" className="mt-10">
        <h2 id="recent-practice" className="text-2xl font-semibold">
          Recent practice
        </h2>
        <div className="mt-4">
          <RecentPracticeList recent={recent} timezone={profile?.timezone ?? "Asia/Kolkata"} />
        </div>
        <p className="mt-4">
          <Link href="/history" className="underline underline-offset-4">
            All your speeches
          </Link>
        </p>
      </section>
    </>
  );
}

function RecentPracticeList({ recent, timezone }: { recent: RecentPractice[] | null; timezone: string }) {
  if (recent === null) {
    return (
      <p role="alert" className="text-red-800">
        We couldn&apos;t load your recent practice. Please refresh the page.
      </p>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="text-neutral-700">
        <p>You haven&apos;t practised yet. A sample speech is a good place to start:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          {samples.map((sample) => (
            <li key={sample.slug}>
              <Link href={`/samples/${sample.slug}`} className="underline underline-offset-4">
                {sample.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });

  return (
    <ul className="space-y-3">
      {recent.map((item) => {
        const links = item.links;
        return (
          <li key={item.sessionId} className="rounded-md border border-neutral-300 p-3">
            {links ? (
              <Link href={links.pageHref} className="font-medium underline underline-offset-4">
                {item.title}
              </Link>
            ) : (
              <p className="font-medium">{item.title}</p>
            )}
            <p className="mt-1 text-sm text-neutral-600">
              {sessionStatusLabel(item.status, item.progress, links?.open != null)} ·{" "}
              {formatClock(item.activeSeconds)} spoken · {date.format(new Date(item.lastActiveAt))}
            </p>
            <div className="mt-2">
              {links ? (
                <PracticeLink
                  speechId={links.progressId}
                  wordCount={links.wordCount}
                  href={links.practiceHref}
                  session={links.open}
                  startLabel="Practise again"
                  className={smallButton}
                />
              ) : (
                <p className="text-sm text-neutral-600">This speech has been deleted.</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Topic ideas by category. Each opens Create with the topic filled in. */
function SuggestedTopics() {
  return (
    <section aria-labelledby="suggested-topics" className="mt-10">
      <h2 id="suggested-topics" className="text-2xl font-semibold">
        Suggested topics
      </h2>
      <p className="mt-2 text-neutral-700">
        Pick one to get started, or write your own on the next page.
      </p>
      <dl className="mt-4 space-y-4">
        {practice.suggestedTopics.map(({ category, topics }) => (
          <div key={category}>
            <dt className="text-sm font-medium text-neutral-600">{category}</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Link
                  key={topic}
                  href={`/create?topic=${encodeURIComponent(topic)}`}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
                >
                  {topic}
                </Link>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
