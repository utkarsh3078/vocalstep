import type { Metadata } from "next";
import { Suspense } from "react";

import { signOut } from "@/app/actions/auth";
import { practice } from "@/config/practice";
import { requireUser } from "@/lib/auth/session";
import { getPracticeStats } from "@/lib/practice/data";
import { formatDays, formatMinutes, type PracticeStats } from "@/lib/practice/streaks";
import { firstParam } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <section>
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <Suspense fallback={<p role="status" className="mt-6">Loading your account…</p>}>
        <Account searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const user = await requireUser("/account");
  const { updated } = await searchParams;

  const supabase = await createClient();
  const [{ data: profile, error }, stats] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getPracticeStats(supabase, user.id),
  ]);
  // The page shows a short message; the server log says why.
  if (error) console.error("Could not load the profile:", error.code, error.message);

  return (
    <div className="mt-6 space-y-6">
      {firstParam(updated) === "password" && (
        <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
          Your password has been changed.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          We couldn&apos;t load your profile just now. Please refresh the page.
        </p>
      )}

      <dl className="space-y-3">
        <div>
          <dt className="text-sm text-neutral-600">Name</dt>
          <dd>{profile?.full_name ?? "Not set"}</dd>
        </div>
        <div>
          <dt className="text-sm text-neutral-600">Email</dt>
          <dd>{user.email ?? "Not available"}</dd>
        </div>
      </dl>

      <PracticeSummary stats={stats} />

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

function PracticeSummary({ stats }: { stats: PracticeStats | null }) {
  const items = stats && [
    ["Current streak", formatDays(stats.currentStreak)],
    ["Best streak", formatDays(stats.bestStreak)],
    ["Today", formatMinutes(stats.todaySeconds)],
    ["All practice", formatMinutes(stats.totalSeconds)],
    ["Sessions completed", String(stats.completedSessions)],
  ];

  return (
    <section aria-labelledby="your-practice" className="border-t border-neutral-200 pt-6">
      <h2 id="your-practice" className="text-2xl font-semibold">
        Your practice
      </h2>
      {items ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {items.map(([label, value]) => (
              <div key={label} className="rounded-md border border-neutral-300 p-3">
                <dt className="text-sm text-neutral-600">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-neutral-600">
            A day counts toward your streak with at least {practice.tracking.streakMinMinutes} minutes
            of practice.
          </p>
        </>
      ) : (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          We couldn&apos;t load your practice totals just now. Please refresh the page.
        </p>
      )}
    </section>
  );
}
