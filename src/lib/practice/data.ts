import "server-only";

import type { createClient } from "@/lib/supabase/server";

import type { OpenSession } from "./resume";
import { localDate, summarisePractice, type PracticeStats } from "./streaks";
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

/** The user's minutes, sessions and streaks, or null if they could not be read. */
export async function getPracticeStats(supabase: Supabase, userId: string): Promise<PracticeStats | null> {
  const [days, profile] = await Promise.all([
    supabase
      .from("daily_practice")
      .select("practice_date, seconds, sessions")
      .order("practice_date", { ascending: false })
      .limit(5000),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);
  if (days.error) {
    console.error("Could not load practice totals:", days.error.code, days.error.message);
    return null;
  }

  const today = localDate(profile.data?.timezone ?? "Asia/Kolkata", new Date());
  return summarisePractice(
    days.data.map((row) => ({ date: row.practice_date, seconds: row.seconds, sessions: row.sessions })),
    today,
  );
}
