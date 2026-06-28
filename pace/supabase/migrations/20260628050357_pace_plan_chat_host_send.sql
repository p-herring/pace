-- Plan chat already lives in pace_plan_messages. This widens send access so
-- the host/organiser can chat even though hosts are not stored as participants.

drop policy if exists "pace messages confirmed send" on public.pace_plan_messages;
drop policy if exists "pace messages participants and hosts send" on public.pace_plan_messages;

create policy "pace messages participants and hosts send"
on public.pace_plan_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    public.pace_is_confirmed_participant(plan_id)
    or exists (
      select 1
      from public.pace_plans plan
      where plan.id = plan_id
        and plan.host_id = (select auth.uid())
        and plan.status <> 'cancelled'
    )
  )
);
