-- Profiles: one row per user, created by a trigger when the user signs up.
--
-- Users can read and update their own row, and only the preference columns.
-- They cannot insert or delete rows: the trigger creates the row and it goes
-- away with the account. There is no email column; email lives in auth.users.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 100),
  -- The user's IANA time zone, used to decide which day practice counts for.
  timezone text not null default 'Asia/Kolkata',
  pref_wpm smallint check (pref_wpm between 40 and 400),
  pref_font_size smallint check (pref_font_size between 12 and 120),
  pref_line_height numeric(3, 2) check (pref_line_height between 1 and 3),
  pref_theme text check (pref_theme in ('dark', 'light')),
  -- Plain text, checked against the app's config, so new values need no migration.
  last_language text check (char_length(last_language) between 1 and 16),
  last_difficulty text check (char_length(last_difficulty) between 1 and 32),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user. Created by the on_auth_user_created trigger; users may update their own preferences only.';

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Table privileges, on top of RLS. Signed-out visitors get nothing; signed-in
-- users may read and change only the listed columns.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (
  full_name,
  timezone,
  pref_wpm,
  pref_font_size,
  pref_line_height,
  pref_theme,
  last_language,
  last_difficulty
) on table public.profiles to authenticated;

-- Rejects a time zone Postgres does not know, so later date maths cannot fail.
create function public.check_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
exception
  when invalid_parameter_value then
    raise exception 'Unknown time zone: %', new.timezone
      using errcode = 'check_violation';
end;
$$;

create trigger check_profile_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.check_profile_timezone();

-- Creates the profile when a user signs up. Email sign-up passes the name as
-- `full_name`; Google passes `full_name` or `name`.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(
      left(
        trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')),
        100
      ),
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.check_profile_timezone() from public, anon, authenticated;
