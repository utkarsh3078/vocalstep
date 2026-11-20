-- Practice tracking: sessions, daily minutes and streaks (upgrade U1).
--
-- Users can only read these tables. Every write goes through the two
-- functions below, which check ownership and keep the numbers honest:
--
--   start_practice_session(...)  begins a session on one of the user's own
--                                speeches, or on a sample speech;
--   record_practice(...)         saves progress and adds practice time to
--                                today's total, in the user's time zone.
--
-- Two numbers here must match src/config/practice.ts; change both together
-- (here with a new migration):
--
--   a session counts as completed at this progress ........ 0.9  (completionThreshold)
--   most seconds one record_practice call can add ......... 60   (sync.maxSecondsPerSave)

-- ---------------------------------------------------------------------------
-- Tables

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- One of the user's speeches, or a sample (by its slug). Speeches are only
  -- soft-deleted, so practice history survives deleting a speech.
  speech_id uuid references public.speeches (id) on delete set null,
  sample_slug text check (sample_slug ~ '^[a-z0-9-]{1,80}$'),
  -- The speech's version when the session started. An edit bumps the speech
  -- version, and a saved position in the old text no longer applies.
  speech_version integer not null default 1 check (speech_version >= 1),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  last_word_index integer not null default 0 check (last_word_index >= 0),
  progress numeric(5, 4) not null default 0 check (progress between 0 and 1),
  started_at timestamptz not null default now(),
  -- The last save.
  last_active_at timestamptz not null default now(),
  -- Practice time is credited against the clock: this moves forward by each
  -- second added, so the time added can never run ahead of real time. See
  -- record_practice().
  credited_until timestamptz not null default now(),
  completed_at timestamptz,
  constraint practice_sessions_one_target check (speech_id is null or sample_slug is null)
);

comment on table public.practice_sessions is
  'One practice run through a speech or sample. Written only by start_practice_session() and record_practice().';

-- At most one unfinished session per speech, and per sample for each user.
create unique index practice_sessions_open_speech_idx
  on public.practice_sessions (speech_id)
  where status = 'in_progress' and speech_id is not null;
create unique index practice_sessions_open_sample_idx
  on public.practice_sessions (user_id, sample_slug)
  where status = 'in_progress' and sample_slug is not null;

-- Recent sessions for a user.
create index practice_sessions_user_active_idx
  on public.practice_sessions (user_id, last_active_at desc);

create table public.daily_practice (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The user's local date, from their profile time zone.
  practice_date date not null,
  seconds integer not null default 0 check (seconds >= 0),
  -- Sessions completed that day.
  sessions integer not null default 0 check (sessions >= 0),
  primary key (user_id, practice_date)
);

comment on table public.daily_practice is
  'Practice time per user per local day, for totals and streaks. Written only by record_practice().';

alter table public.practice_sessions enable row level security;
alter table public.daily_practice enable row level security;

create policy "Users can read their own practice sessions"
  on public.practice_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own daily practice"
  on public.daily_practice for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Read only. No insert, update or delete privileges and no policies for them:
-- the functions below are the only way in.
revoke all on table public.practice_sessions from anon, authenticated;
revoke all on table public.daily_practice from anon, authenticated;
grant select on table public.practice_sessions to authenticated;
grant select on table public.daily_practice to authenticated;

-- ---------------------------------------------------------------------------
-- Starting a session

-- Begins a new session for the signed-in user on one target: their own ready
-- speech, or a sample. Any unfinished session on the same target is marked
-- abandoned, so "Practise again" and "Restart" always start fresh.
--
-- user_timezone, when given and valid, becomes the profile's time zone, so
-- practice counts toward the day the user sees on their own clock.
create function public.start_practice_session(
  target_speech uuid default null,
  target_sample text default null,
  user_timezone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_version integer := 1;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if (target_speech is null) = (target_sample is null) then
    raise exception 'Give exactly one of a speech or a sample' using errcode = '22023';
  end if;

  if target_speech is not null then
    select s.version into current_version
    from public.speeches s
    where s.id = target_speech
      and s.user_id = uid
      and s.deleted_at is null
      and s.status = 'ready';
    if not found then
      raise exception 'No such speech' using errcode = 'P0002';
    end if;
  end if;

  if user_timezone is not null then
    begin
      update public.profiles
      set timezone = user_timezone
      where id = uid and timezone is distinct from user_timezone;
    exception
      -- An unknown time zone (rejected by check_profile_timezone) is ignored.
      when check_violation then null;
    end;
  end if;

  -- One start at a time per user, so two quick starts cannot both open a session.
  perform pg_advisory_xact_lock(hashtextextended('practice:' || uid::text, 0));

  update public.practice_sessions p
  set status = 'abandoned'
  where p.user_id = uid
    and p.status = 'in_progress'
    and (p.speech_id = target_speech or p.sample_slug = target_sample);

  insert into public.practice_sessions (user_id, speech_id, sample_slug, speech_version)
  values (uid, target_speech, target_sample, current_version)
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.start_practice_session(uuid, text, text) from public, anon;
grant execute on function public.start_practice_session(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Recording progress

-- Saves the position in one of the user's sessions and adds practice time to
-- today's total. Called every few seconds while practising, on pause, when the
-- page closes, and once more on finishing (`complete`).
--
-- Time is checked against the clock. Each session has an allowance that fills
-- at one second per second and holds at most 60 seconds; each second added
-- uses one up. So one call adds at most 60 seconds, calling faster cannot add
-- time faster, and a save delayed by the network loses nothing, because its
-- unused allowance carries over to the next save.
--
-- Returns false, changing nothing, when the session is already finished or
-- abandoned (a late save after "Finish", for example).
create function public.record_practice(
  session_id uuid,
  delta_seconds integer,
  word_index integer,
  progress numeric,
  complete boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_session public.practice_sessions%rowtype;
  window_start timestamptz;
  added integer;
  clean_progress numeric := least(1, greatest(0, coalesce(progress, 0)));
  finished boolean;
  zone text;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into current_session
  from public.practice_sessions p
  where p.id = session_id and p.user_id = uid
  for update;
  if not found then
    raise exception 'No such practice session' using errcode = 'P0002';
  end if;
  if current_session.status <> 'in_progress' then
    return false;
  end if;

  -- Allowance older than 60 seconds expires, so idle time is not saved up.
  window_start := greatest(current_session.credited_until, now() - interval '60 seconds');
  added := greatest(
    0,
    least(coalesce(delta_seconds, 0), floor(extract(epoch from now() - window_start))::integer)
  );
  finished := coalesce(complete, false) and clean_progress >= 0.9;

  update public.practice_sessions p
  set active_seconds = p.active_seconds + added,
      last_word_index = greatest(0, coalesce(word_index, 0)),
      progress = clean_progress,
      last_active_at = now(),
      credited_until = window_start + make_interval(secs => added),
      status = case when finished then 'completed' else p.status end,
      completed_at = case when finished then now() else null end
  where p.id = current_session.id;

  if added > 0 or finished then
    select pr.timezone into zone from public.profiles pr where pr.id = uid;

    insert into public.daily_practice (user_id, practice_date, seconds, sessions)
    values (
      uid,
      (now() at time zone coalesce(zone, 'Asia/Kolkata'))::date,
      added,
      case when finished then 1 else 0 end
    )
    on conflict (user_id, practice_date) do update
    set seconds = public.daily_practice.seconds + excluded.seconds,
        sessions = public.daily_practice.sessions + excluded.sessions;
  end if;

  return true;
end;
$$;

revoke all on function public.record_practice(uuid, integer, integer, numeric, boolean) from public, anon;
grant execute on function public.record_practice(uuid, integer, integer, numeric, boolean) to authenticated;
