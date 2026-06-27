-- Supports in-app account deletion (required by both Apple and Google policy for
-- any app with account creation). pace_plans.host_id and pace_groups.owner_id are
-- both ON DELETE RESTRICT, so deleting auth.users directly would fail with a
-- foreign-key violation for anyone who has ever hosted a plan or owned a group.
-- This function clears those two references first; the caller is expected to
-- follow it with supabase.auth.admin.deleteUser(), which then cascades through
-- pace_profiles and everything beneath it.

create or replace function public.pace_prepare_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in required'; end if;

  -- Let anyone still on a plan this account hosts know it's being cancelled,
  -- before the plan row itself goes away below.
  insert into public.pace_notifications(profile_id, type, title, body, plan_id)
  select participants.profile_id, 'cancelled', 'Plan cancelled',
         'The host removed their Pace account, so this plan is cancelled.',
         participants.plan_id
  from public.pace_plan_participants participants
  join public.pace_plans plans on plans.id = participants.plan_id
  where plans.host_id = me
    and participants.status in ('confirmed', 'waitlisted', 'requested')
    and participants.profile_id <> me;

  -- Clear both RESTRICT references so the rest of this profile's data can be
  -- removed via cascade once auth.users is deleted.
  delete from public.pace_plans where host_id = me;
  delete from public.pace_groups where owner_id = me;
end; $$;

revoke all on function public.pace_prepare_account_deletion() from public, anon;
grant execute on function public.pace_prepare_account_deletion() to authenticated;
