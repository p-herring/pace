-- Fixes a critical gap: the only previous path that tried to set
-- pace_profile_private.email_verified_at after initial signup ran through the
-- per-user `authenticated` role, which only has column-level UPDATE grant on
-- (latitude, longitude, phone_e164, safety_acknowledged_at, terms_accepted_at) —
-- not email_verified_at. That update silently failed every time, which meant
-- email_verified_at could never become non-null, which meant the "host a plan"
-- and pace_join_plan() checks (which both require it) could never pass for a
-- real user.
--
-- This trigger runs as the function owner (security definer) directly inside
-- Postgres whenever auth.users.email_confirmed_at changes, so it is not subject
-- to the authenticated role's column grants and does not depend on any
-- particular Next.js code path running afterwards.

create or replace function public.pace_sync_email_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is null or old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.pace_profile_private
    set email_verified_at = new.email_confirmed_at
    where profile_id = new.id;
  end if;
  return new;
end; $$;

revoke all on function public.pace_sync_email_verification() from public, anon, authenticated;

create trigger pace_email_verification_sync_trigger
after update of email_confirmed_at on auth.users
for each row execute function public.pace_sync_email_verification();

-- Backfill: anyone who already confirmed their email before this trigger
-- existed would otherwise be stuck with email_verified_at = null forever.
update public.pace_profile_private private
set email_verified_at = users.email_confirmed_at
from auth.users users
where private.profile_id = users.id
  and users.email_confirmed_at is not null
  and private.email_verified_at is null;
