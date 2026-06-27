-- Makes "private" plan visibility actually usable. Previously pace_join_plan()
-- unconditionally rejected joining a private plan, and there was no way for a host
-- to invite anyone to one — so "private" was a dead end with no path to ever have
-- a participant. This adds a real invite/accept/decline flow, building on the
-- 'invited' participant status added in the previous migration.

-- pace_notifications.type has its own CHECK constraint with a fixed list — extend
-- it to allow the two new invite-related notification types used below.
alter table public.pace_notifications drop constraint pace_notifications_type_check;
alter table public.pace_notifications add constraint pace_notifications_type_check
  check (type = any (array['join'::text, 'request'::text, 'approved'::text, 'waitlist'::text, 'promoted'::text, 'message'::text, 'changed'::text, 'cancelled'::text, 'starting_soon'::text, 'report_update'::text, 'invite'::text, 'invite_accepted'::text]));

-- Lets an invited (but not yet accepted) person see the plan exists, without
-- granting access to its exact meeting point (that's still gated to confirmed
-- participants only, unchanged).
create or replace function public.pace_is_invited(target_plan uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.pace_plan_participants
    where plan_id = target_plan and profile_id = target_user and status = 'invited'
  );
$$;
revoke all on function public.pace_is_invited(uuid, uuid) from public, anon;
grant execute on function public.pace_is_invited(uuid, uuid) to authenticated;

drop policy if exists "pace plans discoverable safely" on public.pace_plans;
create policy "pace plans discoverable safely" on public.pace_plans for select to authenticated
using (
  (status = any (array['open'::pace_plan_status, 'full'::pace_plan_status]))
  and (starts_at > now())
  and (not pace_is_blocked(host_id, (select auth.uid())))
  and (
    (visibility = 'public'::pace_visibility)
    or ((visibility = 'radius'::pace_visibility) and pace_within_discovery_radius(id))
    or ((visibility = 'members'::pace_visibility) and (group_id is not null) and pace_is_group_member(group_id))
    or (host_id = (select auth.uid()))
    or pace_is_confirmed_participant(id)
    or pace_is_invited(id)
  )
);

-- The host invites a specific profile to their own plan. Deliberately scoped to
-- private plans only — "members" visibility depends on the groups feature, which
-- isn't built yet. Re-invites (after a decline/cancel) are allowed.
create or replace function public.pace_invite_to_plan(target_plan uuid, target_profile uuid)
returns void language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into plan from public.pace_plans where id = target_plan for update;
  if not found then raise exception 'Plan not found'; end if;
  if plan.host_id <> auth.uid() then raise exception 'Only the host can invite people to this plan'; end if;
  if plan.visibility <> 'private' then raise exception 'Invites are only needed for private plans'; end if;
  if target_profile = auth.uid() then raise exception 'You are already hosting this plan'; end if;
  if public.pace_is_blocked(target_profile, auth.uid()) then raise exception 'This person is unavailable'; end if;
  if exists(
    select 1 from public.pace_plan_participants
    where plan_id = target_plan and profile_id = target_profile and status not in ('cancelled', 'declined', 'removed')
  ) then
    raise exception 'Already invited or already on this plan';
  end if;

  insert into public.pace_plan_participants(plan_id, profile_id, status, requested_at)
  values (target_plan, target_profile, 'invited', now())
  on conflict (plan_id, profile_id) do update set status = 'invited', requested_at = now(), cancelled_at = null, responded_at = null;

  insert into public.pace_notifications(profile_id, type, title, body, plan_id)
  values (target_profile, 'invite', 'You’re invited', 'You’ve been invited to a private Pace plan.', target_plan);
end; $$;
revoke all on function public.pace_invite_to_plan(uuid, uuid) from public, anon;
grant execute on function public.pace_invite_to_plan(uuid, uuid) to authenticated;

-- Accepting an invite always confirms the spot directly (the host already chose
-- this specific person), bypassing the usual capacity/approval/waitlist logic —
-- and is now the one way a private plan can ever gain a participant.
create or replace function public.pace_join_plan(target_plan uuid)
returns pace_participant_status language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans; result public.pace_participant_status; next_position integer; already_invited boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.pace_profile_private where profile_id = auth.uid() and email_verified_at is not null and safety_acknowledged_at is not null and terms_accepted_at is not null and not is_suspended) then raise exception 'Complete verification and safety onboarding first'; end if;
  select * into plan from public.pace_plans where id = target_plan for update;
  if not found or plan.status in ('cancelled', 'completed') or plan.starts_at <= now() then raise exception 'This plan is no longer available'; end if;
  if plan.host_id = auth.uid() then raise exception 'Hosts are already participants'; end if;
  if public.pace_is_blocked(plan.host_id, auth.uid()) then raise exception 'This plan is unavailable'; end if;

  select exists(
    select 1 from public.pace_plan_participants
    where plan_id = target_plan and profile_id = auth.uid() and status = 'invited'
  ) into already_invited;

  if not already_invited then
    if exists(select 1 from public.pace_plan_participants where plan_id = target_plan and profile_id = auth.uid() and status not in ('cancelled', 'declined', 'removed')) then raise exception 'You already joined this plan'; end if;
    if plan.visibility = 'private' then raise exception 'This plan is invite-only'; end if;
    if plan.visibility = 'members' and (plan.group_id is null or not public.pace_is_group_member(plan.group_id)) then raise exception 'Group membership required'; end if;
  end if;

  if already_invited then
    result := 'confirmed';
  elsif plan.requires_approval then result := 'requested';
  elsif (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') < plan.capacity then result := 'confirmed';
  else result := 'waitlisted'; select coalesce(max(queue_position), 0) + 1 into next_position from public.pace_plan_participants where plan_id = target_plan and status = 'waitlisted'; end if;

  insert into public.pace_plan_participants(plan_id, profile_id, status, queue_position, joined_at, responded_at)
  values(target_plan, auth.uid(), result, case when result = 'waitlisted' then next_position else null end, case when result = 'confirmed' then now() else null end, case when already_invited then now() else null end)
  on conflict(plan_id, profile_id) do update set status = excluded.status, queue_position = excluded.queue_position, requested_at = now(), joined_at = excluded.joined_at, responded_at = excluded.responded_at, cancelled_at = null;

  update public.pace_plans set status = case when (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') >= plan.capacity then 'full' else 'open' end where id = target_plan;

  insert into public.pace_notifications(profile_id, type, title, body, plan_id) values(plan.host_id, case when result = 'requested' then 'request' when already_invited then 'invite_accepted' else 'join' end, case when result = 'requested' then 'New join request' when already_invited then 'Invite accepted' else 'Someone joined your plan' end, 'Open Pace to view the plan.', target_plan);
  return result;
end; $$;

-- Declining an invite uses 'declined' rather than the generic 'cancelled' used for
-- ordinary leaves, so it's distinguishable later (e.g. don't auto re-invite).
create or replace function public.pace_leave_plan(target_plan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans; promoted uuid; was_invited boolean;
begin
  select * into plan from public.pace_plans where id = target_plan for update;
  if not found then raise exception 'Plan not found'; end if;

  select exists(
    select 1 from public.pace_plan_participants
    where plan_id = target_plan and profile_id = auth.uid() and status = 'invited'
  ) into was_invited;

  update public.pace_plan_participants
  set status = case when was_invited then 'declined' else 'cancelled' end, cancelled_at = now(), responded_at = case when was_invited then now() else responded_at end, queue_position = null
  where plan_id = target_plan and profile_id = auth.uid() and status in ('confirmed', 'waitlisted', 'requested', 'invited');

  if found then
    select profile_id into promoted from public.pace_plan_participants where plan_id = target_plan and status = 'waitlisted' order by queue_position asc for update skip locked limit 1;
    if promoted is not null then
      update public.pace_plan_participants set status = 'confirmed', queue_position = null, joined_at = now(), responded_at = now() where plan_id = target_plan and profile_id = promoted;
      insert into public.pace_notifications(profile_id, type, title, body, plan_id) values(promoted, 'promoted', 'You are in!', 'A place opened up and you were first on the waitlist.', target_plan);
    end if;
  end if;

  update public.pace_plans set status = case when (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') >= capacity then 'full' else 'open' end where id = target_plan;
end; $$;
