-- Speeches: the scripts users practise. Generated in Phase 4.
--
-- There is no service role key, so the app writes speeches with the user's own
-- session, and a user could call the database directly with the same rights.
-- The free-speech count and daily limits are worked out from these rows, so
-- the database itself enforces the rules that keep that count honest:
--
--   * rows are never hard-deleted (soft delete with deleted_at only);
--   * the owner, creation time, topic and settings never change;
--   * created_at is always the real insert time;
--   * status only moves forward: generating -> ready or failed, never back;
--   * the version never goes down, and a deleted speech stays deleted.

create table public.speeches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null check (char_length(topic) between 3 and 300),
  title text check (char_length(title) <= 200),
  content text not null default '' check (char_length(content) <= 60000),
  target_minutes smallint not null check (target_minutes between 1 and 60),
  -- Spoken words only; headings are not counted.
  word_count integer not null default 0 check (word_count >= 0),
  -- Plain text, checked against the app's config, so new values need no migration.
  language text not null check (char_length(language) between 1 and 16),
  difficulty text not null check (char_length(difficulty) between 1 and 32),
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  -- Bumped on every edit, so saved practice positions can tell the text changed.
  version integer not null default 1 check (version >= 1),
  model text check (char_length(model) <= 100),
  tokens_in integer not null default 0 check (tokens_in >= 0),
  tokens_out integer not null default 0 check (tokens_out >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.speeches is
  'Practice scripts. Soft delete only; see the guard triggers for the rules users cannot bypass.';

-- Lists of a user's speeches, newest first.
create index speeches_user_created_idx
  on public.speeches (user_id, created_at desc)
  where deleted_at is null;

-- Counting a user's speeches over a period, deleted and failed ones included.
create index speeches_user_created_all_idx
  on public.speeches (user_id, created_at);

alter table public.speeches enable row level security;

create policy "Users can read their own speeches"
  on public.speeches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own speeches"
  on public.speeches for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'generating');

create policy "Users can update their own speeches"
  on public.speeches for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy, and no delete privilege: speeches are only soft-deleted.

-- Table privileges, on top of RLS. user_id is never writable by users: it
-- always comes from the session through its default.
revoke all on table public.speeches from anon, authenticated;
grant select on table public.speeches to authenticated;
grant insert (
  topic,
  title,
  content,
  target_minutes,
  word_count,
  language,
  difficulty,
  status,
  model,
  tokens_in,
  tokens_out
) on table public.speeches to authenticated;
grant update (
  title,
  content,
  word_count,
  status,
  version,
  model,
  tokens_in,
  tokens_out,
  deleted_at
) on table public.speeches to authenticated;

-- Server-set values on insert, whatever the caller sent.
create function public.speeches_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  new.updated_at := now();
  new.version := 1;
  new.deleted_at := null;
  return new;
end;
$$;

create trigger speeches_before_insert
  before insert on public.speeches
  for each row execute function public.speeches_before_insert();

-- The rules for changing a speech. These apply to every caller, not just users.
create function public.speeches_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
    or new.topic is distinct from old.topic
    or new.target_minutes is distinct from old.target_minutes
    or new.language is distinct from old.language
    or new.difficulty is distinct from old.difficulty then
    raise exception 'The owner, creation time, topic and settings of a speech cannot change'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status and old.status <> 'generating' then
    raise exception 'A speech that is % cannot change status', old.status
      using errcode = 'check_violation';
  end if;

  if new.version < old.version then
    raise exception 'A speech version cannot go down'
      using errcode = 'check_violation';
  end if;

  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'A deleted speech stays deleted'
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger speeches_before_update
  before update on public.speeches
  for each row execute function public.speeches_before_update();

revoke all on function public.speeches_before_insert() from public, anon, authenticated;
revoke all on function public.speeches_before_update() from public, anon, authenticated;
