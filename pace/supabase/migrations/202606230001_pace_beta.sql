-- Pace beta is intentionally separate from the legacy coach/athlete model.
-- It uses only Supabase Postgres, Auth, Realtime and Storage-friendly URLs.

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists citext with schema extensions;

create type public.pace_sport as enum ('run', 'ride', 'swim');
create type public.pace_plan_kind as enum ('social', 'training', 'workout');
create type public.pace_visibility as enum ('public', 'radius', 'members', 'private');
create type public.pace_plan_status as enum ('open', 'full', 'cancelled', 'completed');
create type public.pace_participant_status as enum ('confirmed', 'waitlisted', 'requested', 'declined', 'cancelled', 'removed', 'attended', 'no_show');
create type public.pace_group_kind as enum ('official', 'community', 'ad_hoc');
create type public.pace_group_role as enum ('owner', 'moderator', 'member');
create type public.pace_membership_status as enum ('active', 'pending', 'removed');
create type public.pace_report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.pace_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  suburb text,
  timezone text not null default 'Australia/Perth',
  bio text check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Never select this table for public profile/discovery views.
create table public.pace_profile_private (
  profile_id uuid primary key references public.pace_profiles(id) on delete cascade,
  latitude numeric(8,5),
  longitude numeric(8,5),
  phone_e164 text unique,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  safety_acknowledged_at timestamptz,
  terms_accepted_at timestamptz,
  is_beta_approved boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.pace_profile_sports (
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  sport public.pace_sport not null,
  experience text not null check (experience in ('new', 'social', 'regular', 'experienced')),
  run_pace_min_seconds integer,
  run_pace_max_seconds integer,
  ride_speed_min_kmh numeric(4,1),
  ride_speed_max_kmh numeric(4,1),
  swim_pace_min_seconds integer,
  swim_pace_max_seconds integer,
  preferred_distance_min_km numeric(5,1),
  preferred_distance_max_km numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, sport),
  check (run_pace_min_seconds is null or run_pace_max_seconds is null or run_pace_min_seconds <= run_pace_max_seconds),
  check (ride_speed_min_kmh is null or ride_speed_max_kmh is null or ride_speed_min_kmh <= ride_speed_max_kmh),
  check (swim_pace_min_seconds is null or swim_pace_max_seconds is null or swim_pace_min_seconds <= swim_pace_max_seconds)
);

create table public.pace_availability (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique(profile_id, weekday, starts_at, ends_at)
);

create table public.pace_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.pace_profiles(id) on delete restrict,
  kind public.pace_group_kind not null default 'community',
  name text not null check (char_length(name) between 3 and 80),
  slug extensions.citext not null unique,
  description text check (char_length(description) <= 1000),
  sport public.pace_sport,
  is_public boolean not null default true,
  requires_approval boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pace_group_memberships (
  group_id uuid not null references public.pace_groups(id) on delete cascade,
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  role public.pace_group_role not null default 'member',
  status public.pace_membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(group_id, profile_id)
);

create table public.pace_plans (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.pace_profiles(id) on delete restrict,
  group_id uuid references public.pace_groups(id) on delete set null,
  sport public.pace_sport not null,
  kind public.pace_plan_kind not null default 'social',
  title text not null check (char_length(title) between 3 and 100),
  description text check (char_length(description) <= 2000),
  terrain text check (terrain in ('road', 'trail', 'track', 'gravel', 'mtb', 'pool', 'open_water', 'mixed')),
  effort text check (effort in ('conversational', 'easy', 'tempo', 'workout', 'race_pace')),
  drop_policy text check (drop_policy in ('not_applicable', 'no_drop', 'regrouping', 'drop')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Australia/Perth',
  distance_km numeric(6,2) check (distance_km > 0 and distance_km <= 1000),
  run_pace_seconds integer check (run_pace_seconds between 120 and 1200),
  ride_speed_kmh numeric(4,1) check (ride_speed_kmh between 5 and 70),
  swim_pace_seconds integer check (swim_pace_seconds between 30 and 600),
  capacity smallint not null default 8 check (capacity between 1 and 100),
  visibility public.pace_visibility not null default 'public',
  discovery_radius_km smallint check (discovery_radius_km between 1 and 100),
  requires_approval boolean not null default false,
  status public.pace_plan_status not null default 'open',
  public_place_acknowledged_at timestamptz not null default now(),
  discovery_latitude numeric(8,3) not null check (discovery_latitude between -90 and 90),
  discovery_longitude numeric(8,3) not null check (discovery_longitude between -180 and 180),
  suburb_label text not null check (char_length(suburb_label) between 2 and 100),
  cancelled_at timestamptz,
  cancellation_reason text check (char_length(cancellation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check ((visibility = 'radius' and discovery_radius_km is not null) or (visibility <> 'radius' and discovery_radius_km is null)),
  check ((sport = 'run' and run_pace_seconds is not null and ride_speed_kmh is null and swim_pace_seconds is null) or
         (sport = 'ride' and ride_speed_kmh is not null and run_pace_seconds is null and swim_pace_seconds is null) or
         (sport = 'swim' and swim_pace_seconds is not null and run_pace_seconds is null and ride_speed_kmh is null))
);

-- Exact location is deliberately separated from the discovery row. Public map/list queries cannot read it.
create table public.pace_plan_private_locations (
  plan_id uuid primary key references public.pace_plans(id) on delete cascade,
  location_name text not null check (char_length(location_name) between 2 and 160),
  address text,
  latitude numeric(8,5) not null check (latitude between -90 and 90),
  longitude numeric(8,5) not null check (longitude between -180 and 180),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pace_plan_participants (
  plan_id uuid not null references public.pace_plans(id) on delete cascade,
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  status public.pace_participant_status not null,
  queue_position integer,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  joined_at timestamptz,
  cancelled_at timestamptz,
  attended_at timestamptz,
  host_note text check (char_length(host_note) <= 500),
  primary key(plan_id, profile_id),
  check ((status = 'waitlisted' and queue_position is not null) or (status <> 'waitlisted' and queue_position is null))
);

create table public.pace_plan_messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pace_plans(id) on delete cascade,
  sender_id uuid not null references public.pace_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pace_blocks (
  blocker_id uuid not null references public.pace_profiles(id) on delete cascade,
  blocked_id uuid not null references public.pace_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.pace_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.pace_profiles(id) on delete cascade,
  reported_profile_id uuid references public.pace_profiles(id) on delete set null,
  plan_id uuid references public.pace_plans(id) on delete set null,
  message_id uuid references public.pace_plan_messages(id) on delete set null,
  reason text not null check (reason in ('safety', 'harassment', 'inappropriate_content', 'spam', 'impersonation', 'other')),
  details text check (char_length(details) <= 2000),
  status public.pace_report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reported_profile_id is not null or plan_id is not null or message_id is not null)
);

create table public.pace_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.pace_profiles(id) on delete cascade,
  type text not null check (type in ('join', 'request', 'approved', 'waitlist', 'promoted', 'message', 'changed', 'cancelled', 'starting_soon', 'report_update')),
  title text not null,
  body text,
  plan_id uuid references public.pace_plans(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.pace_notification_preferences (
  profile_id uuid primary key references public.pace_profiles(id) on delete cascade,
  join_updates boolean not null default true,
  plan_messages boolean not null default true,
  plan_reminders boolean not null default true,
  saved_searches boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.pace_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.pace_profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index pace_plans_discovery_idx on public.pace_plans(status, sport, starts_at) where status in ('open', 'full');
create index pace_plans_coordinate_idx on public.pace_plans(discovery_latitude, discovery_longitude);
create index pace_participants_plan_status_idx on public.pace_plan_participants(plan_id, status, queue_position);
create unique index pace_waitlist_position_idx on public.pace_plan_participants(plan_id, queue_position) where status = 'waitlisted';
create index pace_messages_plan_created_idx on public.pace_plan_messages(plan_id, created_at desc);
create index pace_notifications_profile_idx on public.pace_notifications(profile_id, created_at desc);
create index pace_reports_status_idx on public.pace_reports(status, created_at);

create or replace function public.pace_set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.pace_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pace_profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Pace member'), '@', 1)))
  on conflict (id) do nothing;
  insert into public.pace_profile_private (profile_id, email_verified_at)
  values (new.id, case when new.email_confirmed_at is not null then new.email_confirmed_at else null end)
  on conflict (profile_id) do nothing;
  return new;
end; $$;

create or replace function public.pace_new_group_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pace_group_memberships(group_id, profile_id, role, status)
  values(new.id, new.owner_id, 'owner', 'active');
  return new;
end; $$;

create or replace function public.pace_is_group_member(target_group uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pace_group_memberships where group_id = target_group and profile_id = target_user and status = 'active');
$$;

create or replace function public.pace_is_confirmed_participant(target_plan uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pace_plan_participants where plan_id = target_plan and profile_id = target_user and status in ('confirmed', 'attended'));
$$;

create or replace function public.pace_is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pace_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.pace_within_discovery_radius(target_plan uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.pace_plans plan
    join public.pace_profile_private viewer on viewer.profile_id = target_user
    where plan.id = target_plan
      and viewer.latitude is not null and viewer.longitude is not null
      and 6371 * acos(least(1.0, greatest(-1.0,
        cos(radians(viewer.latitude::double precision)) * cos(radians(plan.discovery_latitude::double precision)) *
        cos(radians(plan.discovery_longitude::double precision) - radians(viewer.longitude::double precision)) +
        sin(radians(viewer.latitude::double precision)) * sin(radians(plan.discovery_latitude::double precision))
      ))) <= plan.discovery_radius_km
  );
$$;

create or replace function public.pace_is_plan_hot(target_plan uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select count(*) >= 5
  from public.pace_plan_participants
  where plan_id = target_plan
    and status in ('confirmed', 'requested', 'waitlisted')
    and requested_at >= now() - interval '60 minutes';
$$;

-- Atomic join: only the function can insert participants, preserving capacity and FIFO waitlist order.
create or replace function public.pace_join_plan(target_plan uuid)
returns public.pace_participant_status language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans; result public.pace_participant_status; next_position integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.pace_profile_private where profile_id = auth.uid() and email_verified_at is not null and safety_acknowledged_at is not null and terms_accepted_at is not null and not is_suspended) then raise exception 'Complete verification and safety onboarding first'; end if;
  select * into plan from public.pace_plans where id = target_plan for update;
  if not found or plan.status in ('cancelled', 'completed') or plan.starts_at <= now() then raise exception 'This plan is no longer available'; end if;
  if plan.host_id = auth.uid() then raise exception 'Hosts are already participants'; end if;
  if public.pace_is_blocked(plan.host_id, auth.uid()) then raise exception 'This plan is unavailable'; end if;
  if exists(select 1 from public.pace_plan_participants where plan_id = target_plan and profile_id = auth.uid() and status not in ('cancelled', 'declined', 'removed')) then raise exception 'You already joined this plan'; end if;
  if plan.visibility = 'private' then raise exception 'This plan is invite-only'; end if;
  if plan.visibility = 'members' and (plan.group_id is null or not public.pace_is_group_member(plan.group_id)) then raise exception 'Group membership required'; end if;
  if plan.requires_approval then result := 'requested';
  elsif (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') < plan.capacity then result := 'confirmed';
  else result := 'waitlisted'; select coalesce(max(queue_position), 0) + 1 into next_position from public.pace_plan_participants where plan_id = target_plan and status = 'waitlisted'; end if;
  insert into public.pace_plan_participants(plan_id, profile_id, status, queue_position, joined_at)
  values(target_plan, auth.uid(), result, case when result = 'waitlisted' then next_position else null end, case when result = 'confirmed' then now() else null end)
  on conflict(plan_id, profile_id) do update set status = excluded.status, queue_position = excluded.queue_position, requested_at = now(), joined_at = excluded.joined_at, cancelled_at = null;
  update public.pace_plans set status = case when (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') >= plan.capacity then 'full' else 'open' end where id = target_plan;
  insert into public.pace_notifications(profile_id, type, title, body, plan_id) values(plan.host_id, case when result = 'requested' then 'request' else 'join' end, case when result = 'requested' then 'New join request' else 'Someone joined your plan' end, 'Open Pace to view the plan.', target_plan);
  return result;
end; $$;

create or replace function public.pace_leave_plan(target_plan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans; promoted uuid;
begin
  select * into plan from public.pace_plans where id = target_plan for update;
  if not found then raise exception 'Plan not found'; end if;
  update public.pace_plan_participants set status = 'cancelled', cancelled_at = now(), queue_position = null where plan_id = target_plan and profile_id = auth.uid() and status in ('confirmed', 'waitlisted', 'requested');
  if found then
    select profile_id into promoted from public.pace_plan_participants where plan_id = target_plan and status = 'waitlisted' order by queue_position asc for update skip locked limit 1;
    if promoted is not null then
      update public.pace_plan_participants set status = 'confirmed', queue_position = null, joined_at = now(), responded_at = now() where plan_id = target_plan and profile_id = promoted;
      insert into public.pace_notifications(profile_id, type, title, body, plan_id) values(promoted, 'promoted', 'You are in!', 'A place opened up and you were first on the waitlist.', target_plan);
    end if;
  end if;
  update public.pace_plans set status = case when (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') >= capacity then 'full' else 'open' end where id = target_plan;
end; $$;

create or replace function public.pace_respond_to_request(target_plan uuid, target_profile uuid, approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare plan public.pace_plans; next_position integer;
begin
  select * into plan from public.pace_plans where id = target_plan for update;
  if plan.host_id <> auth.uid() then raise exception 'Only the host can respond'; end if;
  if not approve then update public.pace_plan_participants set status = 'declined', responded_at = now() where plan_id = target_plan and profile_id = target_profile and status = 'requested';
  elsif (select count(*) from public.pace_plan_participants where plan_id = target_plan and status = 'confirmed') < plan.capacity then update public.pace_plan_participants set status = 'confirmed', joined_at = now(), responded_at = now() where plan_id = target_plan and profile_id = target_profile and status = 'requested';
  else select coalesce(max(queue_position), 0) + 1 into next_position from public.pace_plan_participants where plan_id = target_plan and status = 'waitlisted'; update public.pace_plan_participants set status = 'waitlisted', queue_position = next_position, responded_at = now() where plan_id = target_plan and profile_id = target_profile and status = 'requested'; end if;
  insert into public.pace_notifications(profile_id, type, title, body, plan_id) values(target_profile, case when approve then 'approved' else 'changed' end, case when approve then 'Your request was approved' else 'Your request was declined' end, 'Open Pace for the plan details.', target_plan);
end; $$;

create or replace function public.pace_join_group(target_group uuid)
returns public.pace_membership_status language plpgsql security definer set search_path = public as $$
declare target public.pace_groups; result public.pace_membership_status;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into target from public.pace_groups where id = target_group for update;
  if not found or not target.is_public then raise exception 'This group is unavailable'; end if;
  result := case when target.requires_approval then 'pending' else 'active' end;
  insert into public.pace_group_memberships(group_id, profile_id, role, status) values(target_group, auth.uid(), 'member', result)
  on conflict(group_id, profile_id) do update set status = excluded.status, updated_at = now()
  where public.pace_group_memberships.status <> 'removed';
  return result;
end; $$;

create trigger pace_new_auth_user_trigger after insert on auth.users for each row execute function public.pace_new_auth_user();
create trigger pace_new_group_membership_trigger after insert on public.pace_groups for each row execute function public.pace_new_group_membership();
create trigger pace_profiles_updated before update on public.pace_profiles for each row execute function public.pace_set_updated_at();
create trigger pace_sports_updated before update on public.pace_profile_sports for each row execute function public.pace_set_updated_at();
create trigger pace_groups_updated before update on public.pace_groups for each row execute function public.pace_set_updated_at();
create trigger pace_group_memberships_updated before update on public.pace_group_memberships for each row execute function public.pace_set_updated_at();
create trigger pace_plans_updated before update on public.pace_plans for each row execute function public.pace_set_updated_at();
create trigger pace_plan_private_locations_updated before update on public.pace_plan_private_locations for each row execute function public.pace_set_updated_at();
create trigger pace_messages_updated before update on public.pace_plan_messages for each row execute function public.pace_set_updated_at();

alter table public.pace_profiles enable row level security;
alter table public.pace_profile_private enable row level security;
alter table public.pace_profile_sports enable row level security;
alter table public.pace_availability enable row level security;
alter table public.pace_groups enable row level security;
alter table public.pace_group_memberships enable row level security;
alter table public.pace_plans enable row level security;
alter table public.pace_plan_private_locations enable row level security;
alter table public.pace_plan_participants enable row level security;
alter table public.pace_plan_messages enable row level security;
alter table public.pace_blocks enable row level security;
alter table public.pace_reports enable row level security;
alter table public.pace_notifications enable row level security;
alter table public.pace_notification_preferences enable row level security;
alter table public.pace_audit_events enable row level security;

grant select, insert on public.pace_profiles, public.pace_profile_sports, public.pace_availability, public.pace_groups, public.pace_plans, public.pace_plan_private_locations, public.pace_plan_messages, public.pace_blocks, public.pace_reports, public.pace_notifications, public.pace_notification_preferences to authenticated;
grant update (display_name, avatar_url, suburb, timezone, bio) on public.pace_profiles to authenticated;
grant select on public.pace_profile_private to authenticated;
grant update (latitude, longitude, phone_e164, safety_acknowledged_at, terms_accepted_at) on public.pace_profile_private to authenticated;
grant update on public.pace_profile_sports, public.pace_availability, public.pace_groups, public.pace_group_memberships, public.pace_plans, public.pace_plan_private_locations, public.pace_plan_messages, public.pace_blocks, public.pace_reports, public.pace_notifications, public.pace_notification_preferences to authenticated;
grant select on public.pace_plan_participants to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on function public.pace_join_plan(uuid), public.pace_leave_plan(uuid), public.pace_respond_to_request(uuid, uuid, boolean), public.pace_join_group(uuid) from public;
grant execute on function public.pace_join_plan(uuid), public.pace_leave_plan(uuid), public.pace_respond_to_request(uuid, uuid, boolean), public.pace_join_group(uuid) to authenticated;
revoke all on function public.pace_is_group_member(uuid, uuid), public.pace_is_confirmed_participant(uuid, uuid), public.pace_is_blocked(uuid, uuid), public.pace_within_discovery_radius(uuid, uuid), public.pace_is_plan_hot(uuid) from public;
grant execute on function public.pace_is_group_member(uuid, uuid), public.pace_is_confirmed_participant(uuid, uuid), public.pace_is_blocked(uuid, uuid), public.pace_within_discovery_radius(uuid, uuid), public.pace_is_plan_hot(uuid) to authenticated;
revoke all on function public.pace_new_auth_user(), public.pace_new_group_membership() from public;

create policy "pace profiles visible to authenticated members" on public.pace_profiles for select to authenticated using (true);
create policy "pace profiles self update" on public.pace_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "pace private profile self access" on public.pace_profile_private for select to authenticated using (profile_id = (select auth.uid()));
create policy "pace private profile self update" on public.pace_profile_private for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()) and is_suspended = false);
create policy "pace sport self access" on public.pace_profile_sports for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "pace availability self access" on public.pace_availability for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "pace public groups readable" on public.pace_groups for select to authenticated using (is_public or public.pace_is_group_member(id) or owner_id = (select auth.uid()));
create policy "pace group host creates" on public.pace_groups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "pace group owner updates" on public.pace_groups for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "pace group memberships readable" on public.pace_group_memberships for select to authenticated using (public.pace_is_group_member(group_id) or profile_id = (select auth.uid()));
create policy "pace plans discoverable safely" on public.pace_plans for select to authenticated using (status in ('open','full') and starts_at > now() and not public.pace_is_blocked(host_id, (select auth.uid())) and (visibility = 'public' or (visibility = 'radius' and public.pace_within_discovery_radius(id)) or (visibility = 'members' and group_id is not null and public.pace_is_group_member(group_id)) or host_id = (select auth.uid()) or public.pace_is_confirmed_participant(id)));
create policy "pace plans host creates" on public.pace_plans for insert to authenticated with check (host_id = (select auth.uid()) and public_place_acknowledged_at is not null and exists(select 1 from public.pace_profile_private private where private.profile_id = (select auth.uid()) and private.email_verified_at is not null and private.safety_acknowledged_at is not null and private.terms_accepted_at is not null and not private.is_suspended));
create policy "pace plans host updates" on public.pace_plans for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "pace private locations involved read" on public.pace_plan_private_locations for select to authenticated using (public.pace_is_confirmed_participant(plan_id) or exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "pace private locations host manages" on public.pace_plan_private_locations for all to authenticated using (exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid()))) with check (exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "pace participants involved select" on public.pace_plan_participants for select to authenticated using (profile_id = (select auth.uid()) or exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "pace messages confirmed members" on public.pace_plan_messages for select to authenticated using (public.pace_is_confirmed_participant(plan_id) or exists(select 1 from public.pace_plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "pace messages confirmed send" on public.pace_plan_messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.pace_is_confirmed_participant(plan_id));
create policy "pace block self manage" on public.pace_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "pace report self create" on public.pace_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "pace report self read" on public.pace_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "pace notification self access" on public.pace_notifications for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "pace preferences self access" on public.pace_notification_preferences for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

alter publication supabase_realtime add table public.pace_plans, public.pace_plan_participants, public.pace_plan_messages, public.pace_notifications;
