import { type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env/public";
import { getPracticeStats } from "@/lib/practice/data";
import type { ProgressResponse } from "@/lib/practice/target";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves practice progress for the signed-in user's session: the position, new
 * practice time, and whether the session is complete.
 *
 * Called with fetch while practising and with navigator.sendBeacon when the
 * page closes. A beacon cannot set a JSON content type, so the body is read as
 * text and parsed here.
 *
 * The database checks ownership and limits the time added (record_practice),
 * so this route only validates and passes the values on.
 */

const bodySchema = z.strictObject({
  sessionId: z.uuid(),
  deltaSeconds: z.int().min(0).max(3600),
  wordIndex: z.int().min(0).max(1_000_000),
  progress: z.number().min(0).max(1),
  complete: z.boolean().optional(),
});

const noStore = { "Cache-Control": "no-store" };
const fail = (status: number) => Response.json({ error: status }, { status, headers: noStore });

/** Another site's page cannot save progress in a user's name. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return fail(403);
  if (!isSupabaseConfigured()) return fail(503);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1000) return fail(413);
    body = JSON.parse(text);
  } catch {
    return fail(400);
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(400);

  // The user always comes from the verified session, never from the request body.
  const user = await getCurrentUser();
  if (!user) return fail(401);

  const { sessionId, deltaSeconds, wordIndex, progress, complete = false } = parsed.data;
  const supabase = await createClient();
  const { data: recorded, error } = await supabase.rpc("record_practice", {
    session_id: sessionId,
    delta_seconds: deltaSeconds,
    word_index: wordIndex,
    progress,
    complete,
  });
  if (error) {
    // P0002: no such session for this user.
    if (error.code === "P0002") return fail(404);
    console.error("Could not save practice progress:", error.code, error.message);
    return fail(500);
  }

  const response: ProgressResponse = { recorded: recorded === true };
  if (complete) response.stats = await getPracticeStats(supabase, user.id);
  return Response.json(response, { headers: noStore });
}
