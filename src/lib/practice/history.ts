import { formatPercent } from "@/lib/teleprompter/timing";

import type { OpenSession } from "./resume";
import { formatMinutes } from "./streaks";

/**
 * Pure helpers for the dashboard and the history page: summing a speech's
 * sessions, choosing recent sessions, and pagination. Unit-tested.
 */

export type SessionStatus = "in_progress" | "completed" | "abandoned";

/** One practice session, as read from practice_sessions. */
export interface SessionRow {
  id: string;
  status: SessionStatus;
  speechVersion: number;
  activeSeconds: number;
  wordIndex: number;
  /** 0–1, as saved by the teleprompter. */
  progress: number;
  /** ISO time of the last save. */
  lastActiveAt: string;
}

/** Everything the history shows about one speech's practice. */
export interface SpeechPractice {
  /** Practice time over every session, edited versions included. */
  activeSeconds: number;
  timesCompleted: number;
  /** ISO time of the most recent save, or null if never practised. */
  lastPractisedAt: string | null;
  /** The unfinished session on the current version, which can be resumed. */
  open: OpenSession | null;
  /** The open session's progress, 0–1, or null when there is none. */
  openProgress: number | null;
}

export function isSessionStatus(value: string): value is SessionStatus {
  return value === "in_progress" || value === "completed" || value === "abandoned";
}

/**
 * Sums one speech's sessions. Only an unfinished session on the speech's
 * current version can be resumed: after an edit the old position no longer
 * applies (the same rule as getOpenSession).
 */
export function summariseSpeechPractice(sessions: readonly SessionRow[], currentVersion: number): SpeechPractice {
  let activeSeconds = 0;
  let timesCompleted = 0;
  let lastPractisedAt: string | null = null;
  let open: SessionRow | null = null;

  for (const session of sessions) {
    activeSeconds += session.activeSeconds;
    if (session.status === "completed") timesCompleted += 1;
    // A session started but never practised (Start, then straight back out)
    // does not count as practice.
    const practised = session.activeSeconds > 0 || session.status === "completed";
    if (practised && (lastPractisedAt === null || Date.parse(session.lastActiveAt) > Date.parse(lastPractisedAt))) {
      lastPractisedAt = session.lastActiveAt;
    }
    if (session.status === "in_progress" && session.speechVersion === currentVersion) open = session;
  }

  return {
    activeSeconds,
    timesCompleted,
    lastPractisedAt,
    open: open && {
      id: open.id,
      wordIndex: open.wordIndex,
      activeSeconds: open.activeSeconds,
      lastActiveAt: open.lastActiveAt,
    },
    openProgress: open ? open.progress : null,
  };
}

/** A one-line description of a speech's practice, for the history list. */
export function practiceStatusLabel(summary: SpeechPractice): string {
  if (summary.openProgress !== null) return `In progress (${formatPercent(summary.openProgress)})`;
  if (summary.timesCompleted === 1) return "Completed once";
  if (summary.timesCompleted > 1) return `Completed ${summary.timesCompleted} times`;
  if (summary.lastPractisedAt) return "Started, not finished";
  return "Not practised yet";
}

/**
 * A one-line description of one session, for the dashboard. `resumable` is
 * false for an unfinished session that can no longer be continued (its speech
 * was edited since).
 */
export function sessionStatusLabel(status: SessionStatus, progress: number, resumable: boolean): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress" && resumable) return `In progress (${formatPercent(progress)})`;
  return `Stopped at ${formatPercent(progress)}`;
}

/**
 * The newest session for each speech or sample, newest first, at most
 * `limit`. `rows` must already be newest first. Practising one speech many
 * times shows it once, with its latest session.
 */
export function latestPerTarget<T extends { targetKey: string }>(rows: readonly T[], limit: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (seen.has(row.targetKey)) continue;
    seen.add(row.targetKey);
    result.push(row);
    if (result.length === limit) break;
  }
  return result;
}

/** Practice time for lists: "None", "Under 1 min", "12 min", "2 h 5 min". */
export function formatPracticeTime(seconds: number): string {
  if (seconds <= 0) return "None";
  if (seconds < 60) return "Under 1 min";
  return formatMinutes(seconds);
}

/** The highest page number accepted from the URL; anything larger is treated as page 1. */
const MAX_PAGE = 10_000;

/** The page number from the URL: a whole number from 1, otherwise 1. */
export function parsePage(value: string | undefined): number {
  if (!value || !/^\d{1,5}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

/** The rows for one page, as an inclusive range (Supabase's `.range(from, to)`). */
export function pageRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** How many pages `total` rows fill. At least 1, so an empty list is "page 1 of 1". */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
