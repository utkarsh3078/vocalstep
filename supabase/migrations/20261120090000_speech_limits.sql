-- Generation limits, enforced in the database.
--
-- Users can insert speeches directly with their own session, so the app's
-- checks alone are not enough. These numbers must match `practice.limits` in
-- src/config/practice.ts; change both together (here with a new migration).
--
--   free speeches per account, for life ........ 2
--   attempts per account per 24 hours ........... 6  (failed and refused included)
--   speeches per 24 hours across all users ...... 80
--
-- A free speech is one that is ready, or still being written. A speech left
-- "generating" for 15 minutes is treated as abandoned and stops counting.
-- Deleted speeches still count: deleting cannot buy more free speeches.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Lets the site-wide count below find recent speeches quickly.
create index if not exists speeches_created_idx on public.speeches (created_at);

-- The counts behind every limit, for one user. Internal: not callable by users.
create function private.speech_counts(target_user uuid)
returns table (free_used integer, attempts_24h integer, global_24h integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)::integer
      from public.speeches s
      where s.user_id = target_user
        and (
          s.status = 'ready'
          or (s.status = 'generating' and s.created_at > now() - interval '15 minutes')
        )
    ),
    (
      select count(*)::integer
      from public.speeches s
      where s.user_id = target_user
        and s.created_at > now() - interval '24 hours'
    ),
    (
      select count(*)::integer
      from public.speeches s
      where s.created_at > now() - interval '24 hours'
    );
$$;

revoke all on function private.speech_counts(uuid) from public, anon, authenticated;

-- The signed-in user's counts, for the app to show and check before starting.
-- Reveals only the user's own numbers and one site-wide total.
create function public.speech_quota()
returns table (free_used integer, attempts_24h integer, global_24h integer)
language sql
stable
security definer
set search_path = ''
as $$
  select * from private.speech_counts(auth.uid());
$$;

revoke all on function public.speech_quota() from public, anon;
grant execute on function public.speech_quota() to authenticated;

-- Refuses a new speech over any limit. Runs for every insert, however it is made.
create function public.speeches_enforce_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  counts record;
begin
  -- One insert at a time per user, so two quick requests cannot both slip
  -- under a limit.
  perform pg_advisory_xact_lock(hashtextextended('speeches:' || new.user_id::text, 0));

  select * into counts from private.speech_counts(new.user_id);

  if counts.free_used >= 2 then
    raise exception 'free_limit_reached' using errcode = 'P0001', hint = 'free_used';
  end if;
  if counts.attempts_24h >= 6 then
    raise exception 'daily_limit_reached' using errcode = 'P0001', hint = 'daily_limit';
  end if;
  if counts.global_24h >= 80 then
    raise exception 'global_limit_reached' using errcode = 'P0001', hint = 'busy';
  end if;

  return new;
end;
$$;

create trigger speeches_enforce_limits
  before insert on public.speeches
  for each row execute function public.speeches_enforce_limits();

revoke all on function public.speeches_enforce_limits() from public, anon, authenticated;
