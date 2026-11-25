import "server-only";

import { practice } from "@/config/practice";
import { findPractisedSample } from "@/lib/samples";
import { displayStatus, type SpeechSummary } from "@/lib/speech/data";
import type { createClient } from "@/lib/supabase/server";

import {
  isSessionStatus,
  latestPerTarget,
  pageRange,
  summariseSpeechPractice,
  type SessionRow,
  type SessionStatus,
  type SpeechPractice,
} from "./history";
import type { OpenSession } from "./resume";
import { localDate, recentDays, summarisePractice, type DayTotal, type PracticeStats } from "./streaks";
import type { PracticeTarget } from "./target";

/** Reads for practice tracking, made as the signed-in user (RLS applies). */

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The user's unfinished session on a speech or sample: null when there is
 * none, undefined when it could not be read (the teleprompter then falls back
 * to this browser's own progress).
 *
 * For a speech, only a session on its current `version` counts: after an
 * edit, practice starts again from the beginning.
 */
export async function getOpenSession(
  supabase: Supabase,
  target: PracticeTarget,
  version = 1,
): Promise<OpenSession | null | undefined> {
  let query = supabase
    .from("practice_sessions")
    .select("id, last_word_index, active_seconds, last_active_at")
    .eq("status", "in_progress")
    .eq("speech_version", version);
  query =
    "speechId" in target
      ? query.eq("speech_id", target.speechId)
      : query.eq("sample_slug", target.sampleSlug);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Could not load the practice session:", error.code, error.message);
    return undefined;
  }
  if (!data) return null;
  return {
    id: data.id,
    wordIndex: data.last_word_index,
    activeSeconds: data.active_seconds,
    lastActiveAt: data.last_active_at,
  };
}

/**
 * The user's unfinished sessions on any of these samples, by slug, in one
 * query (for the library list). Undefined when they could not be read; each
 * button then falls back to this browser's own progress.
 */
export async function getOpenSampleSessions(
  supabase: Supabase,
  slugs: readonly string[],
): Promise<Map<string, OpenSession> | undefined> {
  const { data, error } = await supabase
    .from("practice_sessions")
    .select("id, sample_slug, last_word_index, active_seconds, last_active_at")
    .eq("status", "in_progress")
    .in("sample_slug", [...slugs]);
  if (error) {
    console.error("Could not load the practice sessions:", error.code, error.message);
    return undefined;
  }
  const sessions = new Map<string, OpenSession>();
  for (const row of data) {
    if (!row.sample_slug) continue;
    sessions.set(row.sample_slug, {
      id: row.id,
      wordIndex: row.last_word_index,
      activeSeconds: row.active_seconds,
      lastActiveAt: row.last_active_at,
    });
  }
  return sessions;
}

/** The dashboard's numbers: totals, streaks, and practice on each recent day. */
export interface PracticeOverview {
  stats: PracticeStats;
  /** The last days up to today, oldest first. */
  days: DayTotal[];
  /** Practice in the last 7 days, today included. */
  weekSeconds: number;
}

/** How many days the dashboard chart shows. */
const CHART_DAYS = 14;

/** The user's totals, streaks and recent days, or null if they could not be read. */
export async function getPracticeOverview(supabase: Supabase, userId: string): Promise<PracticeOverview | null> {
  const [rows, profile] = await Promise.all([
    supabase
      .from("daily_practice")
      .select("practice_date, seconds, sessions")
      .order("practice_date", { ascending: false })
      .limit(5000),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);
  if (rows.error) {
    console.error("Could not load practice totals:", rows.error.code, rows.error.message);
    return null;
  }

  const today = localDate(profile.data?.timezone ?? "Asia/Kolkata", new Date());
  const days = rows.data.map((row) => ({ date: row.practice_date, seconds: row.seconds, sessions: row.sessions }));
  const chart = recentDays(days, today, CHART_DAYS);
  return {
    stats: summarisePractice(days, today),
    days: chart,
    weekSeconds: chart.slice(-7).reduce((total, day) => total + day.seconds, 0),
  };
}

/** The user's minutes, sessions and streaks, or null if they could not be read. */
export async function getPracticeStats(supabase: Supabase, userId: string): Promise<PracticeStats | null> {
  return (await getPracticeOverview(supabase, userId))?.stats ?? null;
}

/** Where a recent session can be practised again, or null when its speech is gone. */
export interface PracticeTargetLinks {
  /** The teleprompter. */
  practiceHref: string;
  /** The speech or sample page. */
  pageHref: string;
  /** The key of this browser's saved progress (see the practice pages). */
  progressId: string;
  wordCount: number;
  /** The unfinished session, when this is one that can be resumed. */
  open: OpenSession | null;
}

/** One line of "Recent practice" on the dashboard. */
export interface RecentPractice {
  sessionId: string;
  title: string;
  status: SessionStatus;
  /** 0–1. */
  progress: number;
  activeSeconds: number;
  lastActiveAt: string;
  /** Null when the speech was deleted (practice history is kept). */
  links: PracticeTargetLinks | null;
}

/** How many recent sessions to read, so that repeats of one speech still leave enough to show. */
const RECENT_READ_LIMIT = 50;

/**
 * The user's most recently practised speeches and samples, newest first, each
 * with its latest session. Sessions that were started but never practised are
 * left out, unless they are still open. Null if they could not be read.
 */
export async function listRecentPractice(
  supabase: Supabase,
  limit: number = practice.lists.recentSessions,
): Promise<RecentPractice[] | null> {
  const { data, error } = await supabase
    .from("practice_sessions")
    .select(
      "id, status, progress, active_seconds, last_word_index, last_active_at, speech_version, sample_slug, speech:speeches(id, title, topic, version, word_count, status, deleted_at)",
    )
    .or("status.eq.in_progress,active_seconds.gt.0")
    .order("last_active_at", { ascending: false })
    .limit(RECENT_READ_LIMIT);
  if (error) {
    console.error("Could not load recent practice:", error.code, error.message);
    return null;
  }

  const rows = data.flatMap((row) => {
    if (!isSessionStatus(row.status)) return [];
    const targetKey = row.speech ? `speech:${row.speech.id}` : row.sample_slug ? `sample:${row.sample_slug}` : null;
    return targetKey ? [{ ...row, status: row.status, targetKey }] : [];
  });

  return latestPerTarget(rows, limit).map((row): RecentPractice => {
    const open: OpenSession | null =
      row.status === "in_progress"
        ? {
            id: row.id,
            wordIndex: row.last_word_index,
            activeSeconds: row.active_seconds,
            lastActiveAt: row.last_active_at,
          }
        : null;
    const base = {
      sessionId: row.id,
      status: row.status,
      progress: Number(row.progress),
      activeSeconds: row.active_seconds,
      lastActiveAt: row.last_active_at,
    };

    if (row.speech) {
      const speech = row.speech;
      const available = speech.deleted_at === null && speech.status === "ready";
      return {
        ...base,
        title: speech.title || speech.topic,
        links: available
          ? {
              practiceHref: `/speeches/${speech.id}/practice`,
              pageHref: `/speeches/${speech.id}`,
              progressId: `speech:${speech.id}:v${speech.version}`,
              wordCount: speech.word_count,
              // A session on an older version starts again from the beginning.
              open: row.speech_version === speech.version ? open : null,
            }
          : null,
      };
    }

    const found = findPractisedSample(row.sample_slug ?? "");
    return {
      ...base,
      title: found?.sample.title ?? "A sample speech",
      links: found
        ? {
            practiceHref: found.practiceHref,
            pageHref: found.pageHref,
            progressId: `sample:${found.sample.slug}`,
            wordCount: found.sample.speech.wordCount,
            open,
          }
        : null,
    };
  });
}

/** One speech in the history, with its practice. */
export interface HistoryEntry extends SpeechSummary {
  version: number;
  practice: SpeechPractice;
}

export interface HistoryPage {
  entries: HistoryEntry[];
  /** All the user's speeches that are not deleted. */
  total: number;
}

/**
 * One page of the user's speeches, newest first, with each speech's practice
 * totals. Deleted speeches are left out (their practice still counts in the
 * dashboard totals). Null if they could not be read.
 */
export async function getHistoryPage(supabase: Supabase, page: number): Promise<HistoryPage | null> {
  const { from, to } = pageRange(page, practice.lists.historyPageSize);
  const speeches = await supabase
    .from("speeches")
    .select("id, topic, title, status, word_count, target_minutes, created_at, version", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);
  // A page past the end is an error ("range not satisfiable"), not an empty
  // list. Count the speeches so the page can link back to the last one.
  if (speeches.error?.code === "PGRST103") {
    const { count, error } = await supabase
      .from("speeches")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (!error) return { entries: [], total: count ?? 0 };
  }
  if (speeches.error) {
    console.error("Could not list speeches for the history:", speeches.error.code, speeches.error.message);
    return null;
  }
  const total = speeches.count ?? 0;
  if (speeches.data.length === 0) return { entries: [], total };

  const sessions = await supabase
    .from("practice_sessions")
    .select("id, speech_id, status, speech_version, active_seconds, last_word_index, progress, last_active_at")
    .in(
      "speech_id",
      speeches.data.map((speech) => speech.id),
    )
    .limit(5000);
  if (sessions.error) {
    console.error("Could not load practice for the history:", sessions.error.code, sessions.error.message);
    return null;
  }

  const bySpeech = new Map<string, SessionRow[]>();
  for (const row of sessions.data) {
    if (!row.speech_id || !isSessionStatus(row.status)) continue;
    const list = bySpeech.get(row.speech_id) ?? [];
    list.push({
      id: row.id,
      status: row.status,
      speechVersion: row.speech_version,
      activeSeconds: row.active_seconds,
      wordIndex: row.last_word_index,
      progress: Number(row.progress),
      lastActiveAt: row.last_active_at,
    });
    bySpeech.set(row.speech_id, list);
  }

  const now = Date.now();
  return {
    total,
    entries: speeches.data.map((row) => ({
      id: row.id,
      topic: row.topic,
      title: row.title,
      status: displayStatus(row.status, row.created_at, now),
      wordCount: row.word_count,
      targetMinutes: row.target_minutes,
      createdAt: row.created_at,
      version: row.version,
      practice: summariseSpeechPractice(bySpeech.get(row.id) ?? [], row.version),
    })),
  };
}
