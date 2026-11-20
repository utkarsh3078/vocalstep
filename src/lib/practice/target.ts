import { z } from "zod";

import type { PracticeStats } from "./streaks";

/** What a practice session is about: one of the user's speeches, or a sample. */
export type PracticeTarget = { speechId: string } | { sampleSlug: string };

export const practiceTargetSchema = z.union([
  z.strictObject({ speechId: z.uuid() }),
  z.strictObject({ sampleSlug: z.string().regex(/^[a-z0-9-]{1,80}$/) }),
]);

/** The reply to a progress save (POST /api/practice/progress). */
export interface ProgressResponse {
  /** False when the session was already finished or closed; nothing changed. */
  recorded: boolean;
  /** Sent after completing a session, for the end-of-session screen. */
  stats?: PracticeStats | null;
}
