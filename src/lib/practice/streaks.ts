import { practice } from "@/config/practice";

/** One row of daily practice: the user's local date (YYYY-MM-DD) and its totals. */
export interface PracticeDay {
  date: string;
  seconds: number;
  /** Sessions completed that day. */
  sessions: number;
}

export interface PracticeStats {
  todaySeconds: number;
  /** Days in a row with enough practice, up to today (or yesterday, while today is still open). */
  currentStreak: number;
  bestStreak: number;
  totalSeconds: number;
  completedSessions: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** The calendar date at `at` in `timezone`, as YYYY-MM-DD. Unknown zones fall back to India. */
export function localDate(timezone: string, at: Date): string {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  }
  // en-CA formats dates as YYYY-MM-DD.
  return format.format(at);
}

/** `date` moved by a whole number of days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The current and best streaks: runs of consecutive days with at least
 * `minSeconds` of practice. Today not yet practised does not break the
 * current streak; it continues from yesterday until the day is over.
 */
export function computeStreaks(
  days: readonly PracticeDay[],
  today: string,
  minSeconds = practice.tracking.streakMinMinutes * 60,
): { current: number; best: number } {
  const counted = new Set(
    days.filter((day) => DATE.test(day.date) && day.seconds >= minSeconds).map((day) => day.date),
  );

  let best = 0;
  for (const date of counted) {
    // Count each run once, from its first day.
    if (counted.has(addDays(date, -1))) continue;
    let length = 1;
    while (counted.has(addDays(date, length))) length += 1;
    best = Math.max(best, length);
  }

  let current = 0;
  let day = counted.has(today) ? today : addDays(today, -1);
  while (counted.has(day)) {
    current += 1;
    day = addDays(day, -1);
  }

  return { current, best };
}

/** Everything shown about a user's practice, from their daily rows. */
export function summarisePractice(days: readonly PracticeDay[], today: string): PracticeStats {
  const { current, best } = computeStreaks(days, today);
  let totalSeconds = 0;
  let completedSessions = 0;
  let todaySeconds = 0;
  for (const day of days) {
    totalSeconds += day.seconds;
    completedSessions += day.sessions;
    if (day.date === today) todaySeconds = day.seconds;
  }
  return { todaySeconds, currentStreak: current, bestStreak: best, totalSeconds, completedSessions };
}

/** "0 min", "1 min", "42 min", "2 h 5 min": practice time, rounded down to the minute. */
export function formatMinutes(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "1 day", "3 days". */
export function formatDays(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

/** One day in a chart: its date and practice, oldest first. */
export interface DayTotal {
  date: string;
  seconds: number;
}

/** The last `count` days up to `today`, oldest first, with days not practised as 0. */
export function recentDays(days: readonly PracticeDay[], today: string, count: number): DayTotal[] {
  const byDate = new Map(days.map((day) => [day.date, day.seconds]));
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - count + 1);
    return { date, seconds: byDate.get(date) ?? 0 };
  });
}

/**
 * Practice time for a big number: the number and its unit separately.
 * "42" "min", or "2" "h 5 min" once it reaches an hour. Rounded down to the minute.
 */
export function splitDuration(seconds: number): { value: string; unit: string } {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 60) return { value: String(minutes), unit: "min" };
  const rest = minutes % 60;
  return { value: String(Math.floor(minutes / 60)), unit: rest === 0 ? "h" : `h ${rest} min` };
}
