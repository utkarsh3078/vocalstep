import {
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  Clock,
  Flame,
  Lightbulb,
  Mic,
  Plus,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PracticeLink } from "@/components/teleprompter/practice-link";
import { practice } from "@/config/practice";
import { samples } from "@/content/samples";
import { requireUser } from "@/lib/auth/session";
import { getPracticeOverview, listRecentPractice, type PracticeOverview, type RecentPractice } from "@/lib/practice/data";
import { sessionStatusLabel } from "@/lib/practice/history";
import { formatDays, formatMinutes, splitDuration, type DayTotal } from "@/lib/practice/streaks";
import { getQuotaCounts } from "@/lib/speech/data";
import { checkQuota } from "@/lib/speech/quota";
import { formatClock } from "@/lib/teleprompter/timing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const card = "rounded-card bg-surface shadow-card";
const smallButton =
  "inline-flex items-center justify-center rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:border-faint";
const goalSeconds = practice.tracking.streakMinMinutes * 60;

export default function DashboardPage() {
  return (
    <div data-layout="wide" className={`${container} pt-4 sm:pt-8`}>
      <Suspense
        fallback={
          <p role="status" className={`${card} p-7 text-muted`}>
            Loading your dashboard…
          </p>
        }
      >
        <Dashboard />
      </Suspense>
      <SuggestedTopics />
    </div>
  );
}

async function Dashboard() {
  const user = await requireUser("/dashboard");

  const supabase = await createClient();
  const [{ data: profile, error }, overview, recent, counts] = await Promise.all([
    supabase.from("profiles").select("full_name, timezone").eq("id", user.id).maybeSingle(),
    getPracticeOverview(supabase, user.id),
    listRecentPractice(supabase),
    getQuotaCounts(supabase),
  ]);
  // The name is only a greeting; without it the page still works.
  if (error) console.error("Could not load the profile:", error.code, error.message);
  const name = profile?.full_name?.trim();
  const freeLeft = counts ? checkQuota(counts).freeLeft : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-muted">Dashboard</p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
            {name ? `Welcome back, ${name}.` : "Welcome back."}{" "}
            <span className="text-faint">Ready to speak today?</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {freeLeft !== null && (
            <span className="rounded-full bg-peach-50 px-3 py-1.5 text-sm font-medium text-peach-700">
              {freeLeft === 0
                ? "Free speeches used"
                : freeLeft === 1
                  ? "1 free speech left"
                  : `${freeLeft} free speeches left`}
            </span>
          )}
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-medium text-on-ink transition-colors hover:bg-ink-soft"
          >
            <Plus aria-hidden="true" className="size-4" />
            Start New Practice
          </Link>
        </div>
      </header>

      <Overview overview={overview} />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section aria-labelledby="recent-practice" className={`${card} p-6 sm:p-7 lg:col-span-3`}>
          <div className="flex items-center justify-between gap-4">
            <h2 id="recent-practice" className="text-xl font-semibold tracking-tight">
              Recent practice
            </h2>
            <Link
              href="/history"
              className="inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              All your speeches
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <RecentPracticeList recent={recent} timezone={profile?.timezone ?? "Asia/Kolkata"} />
          </div>
        </section>

        <section aria-labelledby="activity" className={`${card} p-6 sm:p-7 lg:col-span-2`}>
          <h2 id="activity" className="text-xl font-semibold tracking-tight">
            Last 14 days
          </h2>
          {overview ? (
            <ActivityChart days={overview.days} />
          ) : (
            <p role="alert" className="mt-4 text-danger-800">
              We couldn&apos;t load your practice just now. Please refresh the page.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

/** The headline numbers, like the overview card of a dashboard. */
function Overview({ overview }: { overview: PracticeOverview | null }) {
  return (
    <section aria-labelledby="your-practice" className={`${card} mt-8 overflow-hidden`}>
      <h2 id="your-practice" className="px-6 pt-6 text-xl font-semibold tracking-tight sm:px-7 sm:pt-7">
        Your practice
      </h2>
      {overview ? (
        <>
          <OverviewStats overview={overview} />
          <p className="border-t border-line px-6 py-4 text-sm text-muted sm:px-7">
            A day counts toward your streak with at least {practice.tracking.streakMinMinutes} minutes of
            practice.
          </p>
        </>
      ) : (
        <p role="alert" className="m-6 rounded-xl border border-danger-200 bg-danger-50 p-3 text-danger-800 sm:m-7">
          We couldn&apos;t load your practice totals just now. Please refresh the page.
        </p>
      )}
    </section>
  );
}

function OverviewStats({ overview }: { overview: PracticeOverview }) {
  const { stats, weekSeconds } = overview;
  const today = splitDuration(stats.todaySeconds);
  const total = splitDuration(stats.totalSeconds);
  const goalMet = stats.todaySeconds >= goalSeconds;
  const minutesToGo = Math.ceil((goalSeconds - stats.todaySeconds) / 60);

  return (
    // 1px gaps over the line colour draw the dividers, in any number of columns.
    <dl className="mt-2 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        icon={Flame}
        label="Current streak"
        value={String(stats.currentStreak)}
        unit={stats.currentStreak === 1 ? "day" : "days"}
        note={<Pill tone="neutral">Best: {formatDays(stats.bestStreak)}</Pill>}
      />
      <Stat
        icon={Sun}
        label="Today"
        value={today.value}
        unit={today.unit}
        note={
          goalMet ? (
            <Pill tone="mint">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
              Daily goal met
            </Pill>
          ) : (
            <Pill tone="peach">{minutesToGo} min to today&apos;s goal</Pill>
          )
        }
      />
      <Stat
        icon={Clock}
        label="All practice"
        value={total.value}
        unit={total.unit}
        note={<Pill tone="neutral">This week: {formatMinutes(weekSeconds)}</Pill>}
      />
      <Stat
        icon={CircleCheck}
        label="Sessions completed"
        value={String(stats.completedSessions)}
        note={<Pill tone="neutral">Finished speeches</Pill>}
      />
    </dl>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  note: ReactNode;
}) {
  return (
    <div className="bg-surface px-6 py-6 sm:px-7">
      <dt>
        <span className="flex size-11 items-center justify-center rounded-full bg-well">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </span>
        <span className="mt-5 block text-sm font-medium text-muted">{label}</span>
      </dt>
      <dd className="mt-1">
        <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">{value}</span>
        {unit && (
          <>
            {" "}
            <span className="text-lg text-muted">{unit}</span>
          </>
        )}
      </dd>
      <dd className="mt-4">{note}</dd>
    </div>
  );
}

function Pill({ tone, children }: { tone: "mint" | "peach" | "neutral"; children: ReactNode }) {
  const tones = {
    mint: "border-mint-200 bg-mint-50 text-mint-700",
    peach: "border-peach-200 bg-peach-50 text-peach-700",
    neutral: "border-line bg-canvas text-ink-soft",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** "Mon", "17 Nov": dates are YYYY-MM-DD in the user's own time zone, so read them as UTC. */
const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const asDate = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Minutes practised on each of the last 14 days, as columns, with the streak
 * goal drawn across. One series in one colour: height carries the value and
 * the goal line shows which days counted. Screen readers get a table instead.
 */
function ActivityChart({ days }: { days: DayTotal[] }) {
  const max = Math.max(goalSeconds * 2, ...days.map((day) => day.seconds));
  const goalShare = (goalSeconds / max) * 100;
  const daysMet = days.filter((day) => day.seconds >= goalSeconds).length;
  const empty = days.every((day) => day.seconds === 0);
  const first = days[0];
  const last = days.at(-1);

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {first && last && `${dayMonth.format(asDate(first.date))} – ${dayMonth.format(asDate(last.date))}`} ·{" "}
        {daysMet === 1 ? "1 day" : `${daysMet} days`} at the goal
      </p>

      <div aria-hidden="true" className="relative mt-8 h-44">
        <ol className="absolute inset-0 flex items-end gap-0.5">
          {days.map((day, index) => {
            const isToday = index === days.length - 1;
            const share = (day.seconds / max) * 100;
            // Tooltips at the edges open inwards, so they stay inside the card.
            const align = index < 3 ? "left-0" : index > days.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <li key={day.date} className="group relative flex h-full flex-1 items-end justify-center">
                {day.seconds > 0 ? (
                  <div className="relative w-full max-w-6 rounded-t-[4px] bg-mint-700" style={{ height: `${Math.max(share, 2)}%` }}>
                    <Tooltip align={align} day={day} />
                  </div>
                ) : (
                  <div className="relative h-0.5 w-full max-w-6 rounded-full bg-line">
                    <Tooltip align={align} day={day} />
                  </div>
                )}
                {isToday && <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-0.5 w-full max-w-6 bg-ink" />}
              </li>
            );
          })}
        </ol>

        {/* The goal line, over the columns, so it shows which days reached it. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink/50"
          style={{ bottom: `${goalShare}%` }}
        />

        {empty && (
          <p className="absolute inset-x-0 top-1/3 text-center text-sm text-muted">
            Practise for {practice.tracking.streakMinMinutes} minutes to start your streak.
          </p>
        )}
      </div>

      {/* Every day is labelled, so no day goes missing; today's label is bold. */}
      <ol aria-hidden="true" className="mt-2 flex gap-0.5">
        {days.map((day, index) => {
          const isToday = index === days.length - 1;
          return (
            <li
              key={day.date}
              className={`flex-1 text-center text-[0.7rem] ${isToday ? "font-semibold text-ink" : "text-muted"}`}
            >
              {weekday.format(asDate(day.date)).slice(0, 2)}
            </li>
          );
        })}
      </ol>

      <p aria-hidden="true" className="mt-4 flex items-center gap-2 text-xs text-muted">
        <span className="w-5 border-t border-dashed border-ink/50" />
        {practice.tracking.streakMinMinutes} min goal: a day that counts toward your streak
        {last && <span className="ml-auto font-semibold text-ink">Today: {weekday.format(asDate(last.date))}</span>}
      </p>

      <table className="sr-only">
        <caption>Minutes practised each day, last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Practice</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{`${weekday.format(asDate(day.date))} ${dayMonth.format(asDate(day.date))}`}</th>
              <td>{formatMinutes(day.seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Tooltip({ align, day }: { align: string; day: DayTotal }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-full mb-2 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-on-ink opacity-0 transition-opacity group-hover:opacity-100 ${align}`}
    >
      {weekday.format(asDate(day.date))} {dayMonth.format(asDate(day.date))} · {formatMinutes(day.seconds)}
    </span>
  );
}

function RecentPracticeList({ recent, timezone }: { recent: RecentPractice[] | null; timezone: string }) {
  if (recent === null) {
    return (
      <p role="alert" className="text-danger-800">
        We couldn&apos;t load your recent practice. Please refresh the page.
      </p>
    );
  }

  if (recent.length === 0) {
    return (
      <div>
        <p className="text-muted">You haven&apos;t practised yet. A sample speech is a good place to start:</p>
        <ul className="mt-4 divide-y divide-line">
          {samples.map((sample) => (
            <li key={sample.slug} className="flex items-center gap-4 py-3">
              <IconWell icon={BookOpen} />
              <Link href={`/samples/${sample.slug}`} className="flex-1 font-medium underline-offset-4 hover:underline">
                {sample.title}
              </Link>
              <span className="text-sm text-muted">{sample.minutes} min</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });

  return (
    <ul className="divide-y divide-line">
      {recent.map((item) => {
        const links = item.links;
        const resumable = links?.open != null;
        return (
          <li key={item.sessionId} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-2 last:pb-0">
            <IconWell icon={links?.pageHref.startsWith("/samples/") ? BookOpen : Mic} />
            <div className="min-w-48 flex-1">
              {links ? (
                <Link href={links.pageHref} className="font-medium underline-offset-4 hover:underline">
                  {item.title}
                </Link>
              ) : (
                <p className="font-medium text-muted">{item.title}</p>
              )}
              <p className="mt-0.5 text-sm text-muted">
                {sessionStatusLabel(item.status, item.progress, resumable)} · {formatClock(item.activeSeconds)}{" "}
                spoken · {date.format(new Date(item.lastActiveAt))}
              </p>
              {resumable && (
                <div aria-hidden="true" className="mt-2 h-1 max-w-48 overflow-hidden rounded-full bg-well">
                  <div className="h-full rounded-full bg-mint-700" style={{ width: `${item.progress * 100}%` }} />
                </div>
              )}
            </div>
            {links ? (
              <div className="ml-14 sm:ml-0">
                <PracticeLink
                  speechId={links.progressId}
                  wordCount={links.wordCount}
                  href={links.practiceHref}
                  session={links.open}
                  startLabel="Practise again"
                  className={smallButton}
                />
              </div>
            ) : (
              <p className="ml-14 text-sm text-muted sm:ml-0">This speech has been deleted.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function IconWell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-well">
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** Topic ideas by category. Each opens Create with the topic filled in. */
function SuggestedTopics() {
  return (
    <section aria-labelledby="suggested-topics" className={`${card} mt-6 p-6 sm:p-7`}>
      <div className="flex items-start gap-4">
        <IconWell icon={Lightbulb} />
        <div>
          <h2 id="suggested-topics" className="text-xl font-semibold tracking-tight">
            Suggested topics
          </h2>
          <p className="mt-1 text-sm text-muted">Pick one to get started, or write your own on the next page.</p>
        </div>
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {practice.suggestedTopics.map(({ category, topics }) => (
          <div key={category}>
            <dt className="text-sm font-medium text-muted">{category}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Link
                  key={topic}
                  href={`/create?topic=${encodeURIComponent(topic)}`}
                  className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm transition-colors hover:border-faint hover:bg-surface"
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
