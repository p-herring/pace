-- A durable member handle: unique without exposing email addresses.
alter table public.pace_profiles
  add column if not exists username text;

alter table public.pace_profiles
  drop constraint if exists pace_profiles_username_format;

alter table public.pace_profiles
  add constraint pace_profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index pace_profiles_username_unique_idx
  on public.pace_profiles (lower(username))
  where username is not null;

-- Populate it from sign-up metadata for all future accounts. Existing beta members
-- can continue using email until they choose a username from Account settings.
create or replace function public.pace_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pace_profiles (id, display_name, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Pace member'), '@', 1)),
    nullif(lower(new.raw_user_meta_data ->> 'username'), '')
  )
  on conflict (id) do nothing;
  insert into public.pace_profile_private (profile_id, email_verified_at)
  values (new.id, case when new.email_confirmed_at is not null then new.email_confirmed_at else null end)
  on conflict (profile_id) do nothing;
  return new;
end; $$;
