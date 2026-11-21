import { practice } from "@/config/practice";
import { formatDays, formatMinutes, type PracticeStats } from "@/lib/practice/streaks";

/** The user's streaks and totals, or a message when they could not be read. */
export function PracticeStatsList({ stats }: { stats: PracticeStats | null }) {
  if (!stats) {
    return (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
        We couldn&apos;t load your practice totals just now. Please refresh the page.
      </p>
    );
  }

  const items = [
    ["Current streak", formatDays(stats.currentStreak)],
    ["Best streak", formatDays(stats.bestStreak)],
    ["Today", formatMinutes(stats.todaySeconds)],
    ["All practice", formatMinutes(stats.totalSeconds)],
    ["Sessions completed", String(stats.completedSessions)],
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border border-neutral-300 p-3">
            <dt className="text-sm text-neutral-600">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-neutral-600">
        A day counts toward your streak with at least {practice.tracking.streakMinMinutes} minutes of
        practice.
      </p>
    </>
  );
}
