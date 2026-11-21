# VocalStep

**One step closer to confident speaking.** Choose a topic, get a natural speech written
for you, and read it aloud in a distraction-free teleprompter — a few minutes a day.

Live at [vocalstep.in](https://vocalstep.in).

- Guests can practise 3 sample speeches with no account.
- With an account, users generate speeches (5, 10 or 15 minutes, in English; Hindi is switched off for now, see `offered` in `src/config/practice.ts`):
  2 free per account.
- The teleprompter scrolls at a set words-per-minute, highlights the word being read,
  and remembers your place.
- Signed-in users' practice is saved to their account: resume on any device, minutes
  per day, and a daily streak (2 minutes a day counts).

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres, Auth,
Row Level Security), Google Gemini via `@google/genai`, and Vercel.

---

## Contents

1. [Run it locally](#1-run-it-locally)
2. [Set up Supabase](#2-set-up-supabase)
3. [Set up Gemini](#3-set-up-gemini)
4. [Environment variables](#4-environment-variables)
5. [Deploy to Vercel](#5-deploy-to-vercel)
6. [Custom domain: vocalstep.in](#6-custom-domain-vocalstepin)
7. [Launch checklist](#7-launch-checklist)
8. [Working on the code](#8-working-on-the-code)

---

## 1. Run it locally

Needs Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local     # then fill it in (sections 2–4)
npm run dev                    # http://localhost:3000
```

The sample speeches and the teleprompter work with an empty `.env.local`. Accounts need
Supabase (section 2). Generating speeches needs `AI_PROVIDER` (section 3).

**Without using the AI at all:** set `AI_PROVIDER=mock`. Speeches are then placeholder text
written instantly by a stand-in, which costs nothing and needs no key. Use it for all
development and testing.

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## 2. Set up Supabase

Supabase provides the database and sign-in. The Supabase CLI is run through `npx` at a
fixed version, so there is nothing to install: `npx supabase@2.122.1 <command>`.

### 2.1 Create the project

1. Sign in at [supabase.com](https://supabase.com) and create a project. Choose the
   **Mumbai (ap-south-1)** region if most users are in India. Save the database password.
2. Note the **project ref**: the part before `.supabase.co` in the project URL.

### 2.2 Create the tables

```bash
npx supabase@2.122.1 login                         # opens the browser once
npx supabase@2.122.1 link --project-ref YOUR_REF   # asks for the database password
npx supabase@2.122.1 db push                       # applies everything in supabase/migrations
```

Run `db push` again whenever a new file appears in `supabase/migrations`. Never edit a
migration that has been pushed; changes go in a new file.

### 2.3 Auth settings (dashboard)

- **Authentication → URL Configuration**
  - **Site URL:** `https://vocalstep.in` (use `http://localhost:3000` until the site is live).
  - **Redirect URLs:** add `http://localhost:3000/**` and `https://vocalstep.in/**`. To sign
    in on Vercel preview deployments as well, also add
    `https://*-YOUR_VERCEL_TEAM.vercel.app/**`.
- **Authentication → Sign In / Providers → Email**
  - Keep **Confirm email** on.
  - Set **Minimum password length** to **8** (the app asks for 8).
- **Authentication → Email Templates**
  - **Confirm signup:** subject `Confirm your VocalStep account`; body: paste
    `supabase/templates/confirmation.html`.
  - **Reset password:** subject `Reset your VocalStep password`; body: paste
    `supabase/templates/recovery.html`.
  - These links work even when the email is opened on another device; Supabase's default
    templates only work in the browser that asked for the email.

### 2.4 Email sending (before real users)

Supabase's built-in email sender is for testing and sends only a few emails an hour, so
sign-ups will stall. Before launch, set up custom SMTP (for example
[Resend](https://resend.com), which has a free tier) under **Project Settings →
Authentication → SMTP Settings**, sending from an address on `vocalstep.in`.

### 2.5 Check the database rules

`npm run rls-check` signs in as two test users and tries to read and change each other's
data, back-date speeches, delete them, and so on. Every check should pass.

1. In **Authentication → Users**, choose **Add user → Create new user** twice, with
   **Auto Confirm User** ticked. Use made-up addresses you use for nothing else.
2. Run:

   ```bash
   SUPABASE_URL=https://YOUR_REF.supabase.co SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY \
   RLS_USER_A_EMAIL=... RLS_USER_A_PASSWORD=... \
   RLS_USER_B_EMAIL=... RLS_USER_B_PASSWORD=... \
   npm run rls-check
   ```

Each run leaves one failed, soft-deleted test speech on user A (speeches can never be
hard-deleted, by design) and uses one of its 6 daily attempts. It also adds one completed
practice session on a sample, with a few seconds of practice, to user A's totals.

### 2.6 Google sign-in (optional)

Off by default. To turn it on:

1. In [Google Cloud Console](https://console.cloud.google.com), create an OAuth client
   (**APIs & Services → Credentials → Create credentials → OAuth client ID → Web
   application**). Add the authorized redirect URI
   `https://YOUR_REF.supabase.co/auth/v1/callback`.
2. In Supabase, **Authentication → Sign In / Providers → Google**: switch it on and paste
   the client ID and secret.
3. Set `google: true` in `src/config/auth.ts` and redeploy.

## 3. Set up Gemini

1. Open [Google AI Studio](https://aistudio.google.com) → **Get API key** → create a key.
2. **Restrict the key.** In [Google Cloud Console](https://console.cloud.google.com) →
   **APIs & Services → Credentials**, open the key and under **API restrictions** choose
   **Restrict key → Generative Language API**. (Website and IP restrictions don't suit a
   key used from Vercel's servers, so leave those unset.)
3. **Know your limits.** On the free tier the quota belongs to the whole Google project,
   not to each user. See your real limits at
   [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). One speech uses
   3 requests (5 min), 4–5 (10 min) or 6 (15 min), plus at most 2 extra. The app's
   site-wide cap of 80 speeches a day (`practice.limits.globalSpeechesPerDay`) should stay
   well under your daily request limit.
4. **If you ever enable billing**, set a budget alert first: **Cloud Console → Billing →
   Budgets & alerts → Create budget**, with an amount and email alerts at 50%, 90% and 100%.
5. **Privacy:** on the free tier, Google may use prompts and responses to improve its
   products. The Privacy page says so; keep it that way.

Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` (section 4). `GEMINI_MODEL` defaults to
`gemini-3.5-flash-lite`. If you switch to a model that `src/lib/ai/models.ts` doesn't list,
add a rule there for its thinking setting.

## 4. Environment variables

`.env.example` lists them all. Locally they go in `.env.local`; on Vercel, in **Project →
Settings → Environment Variables**. Never commit real values.

| Variable | Needed for | Where it comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Accounts | Supabase → Project Settings → API Keys (or **Connect**) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts | The **publishable** key (`sb_publishable_…`) or the legacy **anon** key |
| `AI_PROVIDER` | Generating speeches | `gemini` in production, `mock` for development. Empty = generation off |
| `GEMINI_API_KEY` | `AI_PROVIDER=gemini` | Google AI Studio (section 3). Server-only: never prefix it `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-3.5-flash-lite` |
| `MOCK_AI_DELAY_MS` | Optional, mock only | Delay between streamed chunks (default 15) |

- Never put Supabase's **secret** or **service_role** key in this app.
- `NEXT_PUBLIC_` values are built into the app, so redeploy (or restart `npm run dev`)
  after changing them.

## 5. Deploy to Vercel

1. Push the repository to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repository. Vercel detects
   Next.js; keep the default build settings.
3. Before the first deploy, add the environment variables from section 4 for
   **Production** (and **Preview** if you want previews to work fully).
4. Deploy. Every push to `main` then deploys to production; other branches get previews.

**Time limits.** Writing a 15-minute speech can take a minute or two. The generation route
allows up to 300 seconds (`maxDuration` in `src/app/api/speeches/generate/route.ts`), which
the Hobby plan supports with **Fluid compute** (on by default for new projects; check
**Project → Settings → Functions**). Without Fluid compute, Hobby stops functions after 60
seconds and long speeches will fail.

## 6. Custom domain: vocalstep.in

1. In Vercel, **Project → Settings → Domains**: add `vocalstep.in` and `www.vocalstep.in`.
   Set `www` to redirect to `vocalstep.in`.
2. At your domain registrar, add the DNS records Vercel shows. Usually that is:
   - an **A** record for `@` pointing to Vercel's IP address, and
   - a **CNAME** record for `www` pointing to Vercel's DNS name.

   Use the exact values from Vercel's Domains page, as they can differ by project.
3. Wait until Vercel shows the domain as valid (minutes to a few hours). HTTPS is set up
   automatically.
4. In Supabase, set the **Site URL** to `https://vocalstep.in` (section 2.3), so email
   links point at the live site.

## 7. Launch checklist

On the live site, in a private browser window:

- [ ] Home page loads; **How it works**, **Features** and the footer links all work.
- [ ] Practise a sample as a guest: Start, pause, change speed, reload (it resumes), finish.
- [ ] Sign up with a real address; the confirmation email arrives and its link signs you in.
- [ ] Generate a speech; text streams in; the review page and teleprompter work.
- [ ] Practise it for a minute, pause, and open it on another device (or a private window,
      signed in): **Resume** picks up at the same place.
- [ ] Finish it: the end screen shows **Today** and **Streak**, and **Your account** shows
      your practice totals.
- [ ] Generate a second one; then the "free speeches used" screen shows.
- [ ] A political topic is politely refused and doesn't use up a free speech.
- [ ] Sign out, reset your password by email, sign in with the new one.
- [ ] `https://vocalstep.in/robots.txt` and `/sitemap.xml` load.
- [ ] No errors in the browser console on any of the above.
- [ ] Privacy and Terms reviewed, their draft notes removed, and `contactEmail` set in
      `src/config/site.ts`.

## 8. Working on the code

- **Config:** every tunable number and list is in `src/config/` — durations, languages,
  limits, refusal messages, teleprompter speed and highlight, site details.
- **Limits are enforced twice:** in `practice.limits` (for messages) and in the database
  (`supabase/migrations/*_speech_limits.sql`, so users can't bypass them). Change both.
  The same goes for `completionThreshold` and `tracking.maxSecondsPerSave`, which
  `*_practice.sql` also enforces.
- **Practice tracking:** the teleprompter saves to the browser every second and, for
  signed-in users, to the server every 15 seconds, on pause and when the page closes
  (`src/lib/practice/tracker.ts` → `POST /api/practice/progress` → `record_practice()`).
  The database credits practice time against the clock, so saves cannot add time faster
  than it passes. Streaks are worked out in `src/lib/practice/streaks.ts`.
- **AI:** behind one interface in `src/lib/ai/` with a Gemini and a mock implementation.
  Prompts are in `prompts.ts`; guardrails in `guardrails.ts`. In mock mode, topic markers
  such as `[refuse]`, `[block]`, `[busy]`, `[error]`, `[short]` and `[bad]` simulate each
  case (see `mock.ts`).
- **Local Supabase in Docker** (optional): `npx supabase@2.122.1 start` (Docker Desktop must
  be running; first run downloads images), `status` for the local URL and keys, `stop` to
  finish. Its emails go to Mailpit at http://127.0.0.1:54324. After a migration change, run
  `npx supabase@2.122.1 db reset`, then `npm run db:types`.
