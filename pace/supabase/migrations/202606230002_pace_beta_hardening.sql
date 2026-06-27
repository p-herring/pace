-- Follow-up hardening after the first Supabase security/performance advisor run.

alter extension citext set schema extensions;

create or replace function public.pace_set_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;

-- Explicitly revoke default and anon execution; mutating RPCs are authenticated-only.
revoke all on function public.pace_new_auth_user(), public.pace_new_group_membership() from public, anon, authenticated;
revoke all on function public.pace_is_group_member(uuid, uuid), public.pace_is_confirmed_participant(uuid, uuid), public.pace_is_blocked(uuid, uuid), public.pace_within_discovery_radius(uuid, uuid), public.pace_is_plan_hot(uuid), public.pace_join_plan(uuid), public.pace_leave_plan(uuid), public.pace_respond_to_request(uuid, uuid, boolean), public.pace_join_group(uuid) from anon;
grant execute on function public.pace_is_group_member(uuid, uuid), public.pace_is_confirmed_participant(uuid, uuid), public.pace_is_blocked(uuid, uuid), public.pace_within_discovery_radius(uuid, uuid), public.pace_is_plan_hot(uuid), public.pace_join_plan(uuid), public.pace_leave_plan(uuid), public.pace_respond_to_request(uuid, uuid, boolean), public.pace_join_group(uuid) to authenticated;

-- Audit data is administrator-only; a deny-all policy makes that intent explicit.
create policy "pace audit events are not directly readable" on public.pace_audit_events for all to authenticated using (false) with check (false);

-- One policy is cheaper and clearer than overlapping host/participant SELECT policies.
drop policy "pace private locations involved read" on public.pace_plan_private_locations;
drop policy "pace private locations host manages" on public.pace_plan_private_locations;
create policy "pace private location access" on public.pace_plan_private_locations for select to authenticated using (
  public.pace_is_confirmed_participant(plan_id)
  or exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid()))
);
create policy "pace private location host writes" on public.pace_plan_private_locations for insert to authenticated with check (
  exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid()))
);
create policy "pace private location host updates" on public.pace_plan_private_locations for update to authenticated using (
  exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid()))
) with check (
  exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid()))
);

create index if not exists pace_audit_events_actor_idx on public.pace_audit_events(actor_id);
create index if not exists pace_blocks_blocked_idx on public.pace_blocks(blocked_id);
create index if not exists pace_group_memberships_profile_idx on public.pace_group_memberships(profile_id);
create index if not exists pace_groups_owner_idx on public.pace_groups(owner_id);
create index if not exists pace_notifications_plan_idx on public.pace_notifications(plan_id);
create index if not exists pace_messages_sender_idx on public.pace_plan_messages(sender_id);
create index if not exists pace_participants_profile_idx on public.pace_plan_participants(profile_id);
create index if not exists pace_plans_group_idx on public.pace_plans(group_id) where group_id is not null;
create index if not exists pace_plans_host_idx on public.pace_plans(host_id);
create index if not exists pace_reports_message_idx on public.pace_reports(message_id) where message_id is not null;
create index if not exists pace_reports_plan_idx on public.pace_reports(plan_id) where plan_id is not null;
create index if not exists pace_reports_profile_idx on public.pace_reports(reported_profile_id) where reported_profile_id is not null;
create index if not exists pace_reports_reporter_idx on public.pace_reports(reporter_id);
