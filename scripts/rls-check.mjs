// Checks the database rules from outside, the way an attacker would: with the
// public key and real user sessions, calling Supabase directly.
//
// Needs two confirmed test accounts that you do not use for anything else.
// Each run adds one failed, soft-deleted test speech to account A (speeches
// cannot be removed, by design). That uses one of A's 6 daily attempts but none
// of its free speeches, so the check can run up to 6 times a day.
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

// Clean up any speech a broken rule let through above.
await a.client.from("speeches").update({ deleted_at: new Date().toISOString() }).is("deleted_at", null).eq("topic", speech.topic);

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
