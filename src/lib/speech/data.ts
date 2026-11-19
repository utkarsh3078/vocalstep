import "server-only";

import { practice, type Difficulty, type LanguageCode } from "@/config/practice";
import type { createClient } from "@/lib/supabase/server";

import type { QuotaCounts } from "./quota";

/** Reads for speeches and profiles, made as the signed-in user (RLS applies). */

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function getQuotaCounts(supabase: Supabase): Promise<QuotaCounts | null> {
  const { data, error } = await supabase.rpc("speech_quota");
  const row = Array.isArray(data) ? data[0] : data;
  if (error) console.error("Could not read the speech counts:", error.code, error.message);
  if (error || !row) return null;
  return { freeUsed: row.free_used, attempts24h: row.attempts_24h, global24h: row.global_24h };
}

function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === "string" && Object.hasOwn(practice.languages, value);
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && Object.hasOwn(practice.difficulties, value);
}

export interface ProfileDefaults {
  language: LanguageCode;
  difficulty: Difficulty;
  timezone: string;
}

/** The user's last-used options, falling back to the app defaults. */
export async function getProfileDefaults(supabase: Supabase, userId: string): Promise<ProfileDefaults> {
  const { data } = await supabase
    .from("profiles")
    .select("last_language, last_difficulty, timezone")
    .eq("id", userId)
    .maybeSingle();

  return {
    language: isLanguage(data?.last_language) ? data.last_language : practice.defaultLanguage,
    difficulty: isDifficulty(data?.last_difficulty) ? data.last_difficulty : practice.defaultDifficulty,
    timezone: data?.timezone ?? "Asia/Kolkata",
  };
}

/**
 * What the user sees: "generating" only while a speech is really being
 * written; one left unfinished for too long is shown as failed.
 */
export type SpeechStatus = "generating" | "ready" | "failed";

export interface SpeechSummary {
  id: string;
  topic: string;
  title: string | null;
  status: SpeechStatus;
  wordCount: number;
  targetMinutes: number;
  createdAt: string;
}

/** The user's most recent speeches that are not deleted, newest first. */
export async function listRecentSpeeches(supabase: Supabase, limit = 10): Promise<SpeechSummary[] | null> {
  const { data, error } = await supabase
    .from("speeches")
    .select("id, topic, title, status, word_count, target_minutes, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Could not list speeches:", error.code, error.message);
    return null;
  }

  const now = Date.now();
  return data.map((row) => ({
    id: row.id,
    topic: row.topic,
    title: row.title,
    status: displayStatus(row.status, row.created_at, now),
    wordCount: row.word_count,
    targetMinutes: row.target_minutes,
    createdAt: row.created_at,
  }));
}

export interface Speech {
  id: string;
  topic: string;
  title: string | null;
  content: string;
  status: SpeechStatus;
  version: number;
  language: LanguageCode;
  difficulty: string;
  targetMinutes: number;
  createdAt: string;
}

/** One speech by id, or null if it does not exist, is deleted or is not the user's. */
export async function getSpeech(supabase: Supabase, id: string): Promise<Speech | null> {
  const { data, error } = await supabase
    .from("speeches")
    .select("id, topic, title, content, status, version, language, difficulty, target_minutes, created_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) console.error("Could not load a speech:", error.code, error.message);
  if (error || !data) return null;

  return {
    id: data.id,
    topic: data.topic,
    title: data.title,
    content: data.content,
    status: displayStatus(data.status, data.created_at, Date.now()),
    version: data.version,
    language: isLanguage(data.language) ? data.language : practice.defaultLanguage,
    difficulty: data.difficulty,
    targetMinutes: data.target_minutes,
    createdAt: data.created_at,
  };
}

/** The status to show, given the time of this request. */
export function displayStatus(status: string, createdAt: string, now: number): SpeechStatus {
  if (status === "ready") return "ready";
  const ageMinutes = (now - Date.parse(createdAt)) / 60_000;
  return status === "generating" && ageMinutes < practice.generation.staleAfterMinutes
    ? "generating"
    : "failed";
}
