import { practice } from "@/config/practice";

/** A user's generation counts, from the database's speech_quota(). */
export interface QuotaCounts {
  freeUsed: number;
  attempts24h: number;
  global24h: number;
}

export type QuotaCheck =
  | { ok: true; freeLeft: number }
  | { ok: false; code: "free_used" | "daily_limit" | "busy"; freeLeft: number };

/**
 * Whether the user may start a new speech. The database enforces the same
 * limits; this check exists to give a clear message before trying.
 */
export interface QuotaLimits {
  freeSpeeches: number;
  attemptsPerDay: number;
  globalSpeechesPerDay: number;
}

export function checkQuota(counts: QuotaCounts, limits: QuotaLimits = practice.limits): QuotaCheck {
  const freeLeft = Math.max(0, limits.freeSpeeches - counts.freeUsed);
  if (freeLeft === 0) return { ok: false, code: "free_used", freeLeft };
  if (counts.attempts24h >= limits.attemptsPerDay) return { ok: false, code: "daily_limit", freeLeft };
  if (counts.global24h >= limits.globalSpeechesPerDay) return { ok: false, code: "busy", freeLeft };
  return { ok: true, freeLeft };
}
