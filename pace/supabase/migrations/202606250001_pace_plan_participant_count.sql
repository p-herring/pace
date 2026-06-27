-- pace_plan_participants rows are only visible to the participant themselves or the
-- plan's host (see "pace participants involved select"), so a regular client-side
-- count() from a non-host viewer would only ever see their own row, not the real
-- total. This security-definer function returns just the aggregate number — no
-- participant identities — so the plan detail page can show "X/Y joined" to anyone
-- who can see the plan at all.

create or replace function public.pace_plan_confirmed_count(target_plan uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.pace_plan_participants
  where plan_id = target_plan and status = 'confirmed';
$$;

revoke all on function public.pace_plan_confirmed_count(uuid) from public, anon;
grant execute on function public.pace_plan_confirmed_count(uuid) to authenticated;
