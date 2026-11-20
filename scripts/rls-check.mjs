// Checks the database rules from outside, the way an attacker would: with the
// public key and real user sessions, calling Supabase directly.
//
// Needs two confirmed test accounts that you do not use for anything else.
// Each run adds one failed, soft-deleted test speech to account A (speeches
// cannot be removed, by design). That uses one of A's 6 daily attempts but none
// of its free speeches, so the check can run up to 6 times a day. It also adds
// one completed practice session on a sample, and a few seconds, to A's totals.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   RLS_USER_A_EMAIL=... RLS_USER_A_PASSWORD=... \
//   RLS_USER_B_EMAIL=... RLS_USER_B_PASSWORD=... \
//   npm run rls-check
//
// SUPABASE_URL and SUPABASE_ANON_KEY fall back to the NEXT_PUBLIC_ names.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accounts = {
  A: [process.env.RLS_USER_A_EMAIL, process.env.RLS_USER_A_PASSWORD],
  B: [process.env.RLS_USER_B_EMAIL, process.env.RLS_USER_B_PASSWORD],
};

if (!url || !key || Object.values(accounts).some(([email, password]) => !email || !password)) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY and the RLS_USER_A_/RLS_USER_B_ EMAIL and PASSWORD variables.");
  process.exit(2);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const results = [];

function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

/** True when the call was refused: an error, or no rows touched. */
const refused = ({ data, error }) => Boolean(error) || (Array.isArray(data) && data.length === 0);
const why = ({ error, data }) => (error ? error.message : `${data?.length ?? 0} rows`);

async function signIn(label) {
  const client = createClient(url, key, options);
  const [email, password] = accounts[label];
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Could not sign in as user ${label}: ${error.message}`);
    process.exit(2);
  }
  return { client, id: data.user.id };
}

const speech = { topic: "RLS check speech", target_minutes: 5, language: "en", difficulty: "beginner" };

// --- Signed-out visitor ---------------------------------------------------
const anon = createClient(url, key, options);
let r = await anon.from("profiles").select("id");
check("signed-out visitors cannot read profiles", refused(r), why(r));
r = await anon.from("speeches").select("id");
check("signed-out visitors cannot read speeches", refused(r), why(r));
r = await anon.from("speeches").insert(speech).select();
check("signed-out visitors cannot create speeches", refused(r), why(r));

const a = await signIn("A");
const b = await signIn("B");

// --- Profiles ----------------------------------------------------------------
r = await a.client.from("profiles").select("id").eq("id", a.id);
check("a user can read their own profile", !r.error && r.data.length === 1, why(r));
r = await b.client.from("profiles").select("id").eq("id", a.id);
check("a user cannot read another user's profile", refused(r), why(r));
r = await b.client.from("profiles").update({ pref_wpm: 200 }).eq("id", a.id).select();
check("a user cannot change another user's profile", refused(r), why(r));
r = await a.client.from("profiles").update({ pref_wpm: 140 }).eq("id", a.id).select();
check("a user can change their own preferences", !r.error && r.data.length === 1, why(r));
r = await a.client.from("profiles").update({ timezone: "Mars/Olympus" }).eq("id", a.id).select();
check("an unknown time zone is rejected", Boolean(r.error), why(r));
r = await a.client.from("profiles").update({ created_at: "2000-01-01" }).eq("id", a.id).select();
check("a profile's creation time cannot change", Boolean(r.error), why(r));
r = await a.client.from("profiles").insert({ id: b.id }).select();
check("a user cannot create profiles", refused(r), why(r));
r = await a.client.from("profiles").delete().eq("id", a.id).select();
check("a user cannot delete their profile", refused(r), why(r));

// --- Speeches: creating ------------------------------------------------------
r = await a.client.from("speeches").insert({ ...speech, created_at: "2000-01-01" }).select();
check("a speech cannot be back-dated", refused(r), why(r));
r = await a.client.from("speeches").insert({ ...speech, user_id: b.id }).select();
check("a speech cannot be created for another user", refused(r), why(r));
r = await a.client.from("speeches").insert({ ...speech, status: "ready" }).select();
check("a speech must start as generating", refused(r), why(r));
r = await a.client.from("speeches").insert(speech).select().single();
const ownSpeech = r.data;
check("a user can create their own speech", !r.error && ownSpeech?.user_id === a.id, why(r));
check(
  "a new speech's creation time is the real time",
  ownSpeech && Math.abs(Date.parse(ownSpeech.created_at) - Date.now()) < 5 * 60_000,
  ownSpeech?.created_at,
);

// --- Speeches: other users --------------------------------------------------
const id = ownSpeech?.id;
r = await b.client.from("speeches").select("id").eq("id", id);
check("a user cannot read another user's speech", refused(r), why(r));
r = await b.client.from("speeches").update({ title: "Taken" }).eq("id", id).select();
check("a user cannot change another user's speech", refused(r), why(r));
r = await b.client.from("speeches").update({ deleted_at: new Date().toISOString() }).eq("id", id).select();
check("a user cannot delete another user's speech", refused(r), why(r));

// --- Speeches: the owner's own limits ----------------------------------------
r = await a.client.from("speeches").delete().eq("id", id).select();
const stillThere = await a.client.from("speeches").select("id").eq("id", id);
check("speeches cannot be hard-deleted", refused(r) && stillThere.data?.length === 1, why(r));
r = await a.client.from("speeches").update({ topic: "Something else" }).eq("id", id).select();
check("a speech's topic cannot change", Boolean(r.error), why(r));
r = await a.client.from("speeches").update({ status: "failed" }).eq("id", id).select();
check("generating can become failed", !r.error && r.data.length === 1, why(r));
r = await a.client.from("speeches").update({ status: "ready" }).eq("id", id).select();
check("a failed speech cannot become ready", Boolean(r.error), why(r));
r = await a.client.from("speeches").update({ version: 2 }).eq("id", id).select();
check("the version can go up", !r.error && r.data.length === 1, why(r));
r = await a.client.from("speeches").update({ version: 1 }).eq("id", id).select();
check("the version cannot go down", Boolean(r.error), why(r));
r = await a.client.from("speeches").update({ deleted_at: new Date().toISOString() }).eq("id", id).select();
check("a user can soft-delete their own speech", !r.error && r.data.length === 1, why(r));
r = await a.client.from("speeches").update({ deleted_at: null }).eq("id", id).select();
check("a deleted speech stays deleted", Boolean(r.error), why(r));
r = await a.client.from("speeches").select("id", { count: "exact", head: true }).eq("id", id);
check("deleted speeches still count toward limits", r.count === 1, `count ${r.count}`);

// --- Limits -----------------------------------------------------------------
r = await a.client.rpc("speech_quota");
const quota = Array.isArray(r.data) ? r.data[0] : r.data;
check(
  "a user can read their own generation counts",
  !r.error && quota && quota.attempts_24h >= 1 && Number.isInteger(quota.free_used),
  r.error ? r.error.message : JSON.stringify(quota),
);
r = await anon.rpc("speech_quota");
check("signed-out visitors cannot read generation counts", Boolean(r.error), why(r));

// --- Practice tracking ---------------------------------------------------------
// Uses a sample, so it needs no ready speech. Adds a few seconds to A's totals.
r = await anon.rpc("start_practice_session", { target_sample: "how-the-internet-works" });
check("signed-out visitors cannot start a practice session", Boolean(r.error), why(r));
r = await anon.from("practice_sessions").select("id");
check("signed-out visitors cannot read practice sessions", refused(r), why(r));
r = await anon.from("daily_practice").select("user_id");
check("signed-out visitors cannot read daily practice", refused(r), why(r));

r = await a.client.rpc("start_practice_session", { target_speech: id });
check("a session cannot start on a deleted or unfinished speech", Boolean(r.error), why(r));
r = await a.client.rpc("start_practice_session", {
  target_speech: id,
  target_sample: "how-the-internet-works",
});
check("a session has exactly one target", Boolean(r.error), why(r));
r = await a.client.rpc("start_practice_session", { target_sample: "how-the-internet-works" });
const sessionId = r.data;
check("a user can start a practice session on a sample", !r.error && typeof sessionId === "string", r.error?.message ?? "started");

r = await a.client.from("practice_sessions").insert({ user_id: a.id, sample_slug: "x" }).select();
check("practice sessions cannot be inserted directly", refused(r), why(r));
r = await a.client.from("practice_sessions").update({ active_seconds: 99999 }).eq("id", sessionId).select();
check("practice sessions cannot be changed directly", refused(r), why(r));
r = await a.client.from("daily_practice").insert({ user_id: a.id, practice_date: "2026-01-01", seconds: 99999 }).select();
check("daily practice cannot be written directly", refused(r), why(r));

r = await b.client.from("practice_sessions").select("id").eq("id", sessionId);
check("a user cannot read another user's practice session", refused(r), why(r));
r = await b.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 5, word_index: 1, progress: 0.1 });
check("a user cannot record practice on another user's session", Boolean(r.error), why(r));

r = await a.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 3600, word_index: 10, progress: 0.2 });
const afterBig = await a.client.from("practice_sessions").select("active_seconds").eq("id", sessionId).single();
check(
  "one save adds no more time than has passed since the session started",
  !r.error && afterBig.data?.active_seconds <= 5,
  r.error ? r.error.message : `${afterBig.data?.active_seconds} s`,
);
r = await a.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 60, word_index: 10, progress: 0.2 });
const afterRepeat = await a.client.from("practice_sessions").select("active_seconds").eq("id", sessionId).single();
check(
  "saving again at once adds almost nothing",
  !r.error && afterRepeat.data.active_seconds - afterBig.data.active_seconds <= 1,
  `${afterRepeat.data?.active_seconds} s`,
);
r = await a.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 0, word_index: 20, progress: 0.5, complete: true });
const early = await a.client.from("practice_sessions").select("status").eq("id", sessionId).single();
check("a session cannot be completed below 90% progress", early.data?.status === "in_progress", early.data?.status);
r = await a.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 0, word_index: 99, progress: 0.95, complete: true });
const done = await a.client.from("practice_sessions").select("status").eq("id", sessionId).single();
check("a session completes at 90% progress or more", !r.error && done.data?.status === "completed", done.data?.status);
r = await a.client.rpc("record_practice", { session_id: sessionId, delta_seconds: 5, word_index: 99, progress: 1 });
check("a completed session takes no more practice time", !r.error && r.data === false, why(r));
r = await a.client.from("daily_practice").select("seconds, sessions");
check("a user can read their own daily practice", !r.error && r.data.length >= 1, why(r));
r = await b.client.from("daily_practice").select("user_id").eq("user_id", a.id);
check("a user cannot read another user's daily practice", refused(r), why(r));

// Clean up any speech a broken rule let through above.
await a.client.from("speeches").update({ deleted_at: new Date().toISOString() }).is("deleted_at", null).eq("topic", speech.topic);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
