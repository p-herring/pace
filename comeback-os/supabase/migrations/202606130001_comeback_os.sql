create extension if not exists pgcrypto;

create type public.integration_provider as enum ('strava', 'trainingpeaks', 'coros');
create type public.metric_kind as enum (
  'bodyweight',
  'lift',
  'running_threshold',
  'ftp',
  'css',
  'custom'
);
create type public.workout_source as enum ('trainingpeaks', 'coros', 'manual');
create type public.activity_source as enum ('strava', 'coros', 'manual');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null default 'Australia/Perth',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_focuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  event_date date,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.external_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.integration_provider not null,
  provider_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, provider)
);

create table if not exists public.planned_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_id text,
  source public.workout_source not null default 'manual',
  scheduled_date date not null,
  title text not null,
  sport text not null,
  duration_minutes integer,
  intensity text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, external_id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  external_id text,
  source public.activity_source not null default 'manual',
  activity_date timestamptz not null,
  name text not null,
  sport text not null,
  duration_seconds integer,
  distance_meters numeric,
  elevation_meters numeric,
  average_heartrate numeric,
  average_power numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, external_id)
);

create table if not exists public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  kind public.metric_kind not null,
  unit text,
  baseline_date date not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.metric_readings (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metric_definitions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recorded_at date not null default current_date,
  numeric_value numeric,
  text_value text,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  water_litres numeric(4, 2) not null default 0,
  water_target_litres numeric(4, 2) not null default 3,
  calories_hit boolean not null default false,
  readiness_score integer check (readiness_score between 0 and 100),
  sleep_hours numeric(4, 2),
  sleep_source text,
  hrv_ms integer,
  resting_heart_rate integer,
  pain_flag text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, log_date)
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  taken_on date not null default current_date,
  is_private boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'Athlete'), '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger event_focuses_set_updated_at before update on public.event_focuses
for each row execute function public.set_updated_at();
create trigger external_accounts_set_updated_at before update on public.external_accounts
for each row execute function public.set_updated_at();
create trigger planned_workouts_set_updated_at before update on public.planned_workouts
for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities
for each row execute function public.set_updated_at();
create trigger metric_definitions_set_updated_at before update on public.metric_definitions
for each row execute function public.set_updated_at();
create trigger daily_logs_set_updated_at before update on public.daily_logs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.event_focuses enable row level security;
alter table public.external_accounts enable row level security;
alter table public.planned_workouts enable row level security;
alter table public.activities enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.metric_readings enable row level security;
alter table public.daily_logs enable row level security;
alter table public.progress_photos enable row level security;

create policy "profiles_self_access" on public.profiles
for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "event_focuses_self_access" on public.event_focuses
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "external_accounts_self_access" on public.external_accounts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "planned_workouts_self_access" on public.planned_workouts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "activities_self_access" on public.activities
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "metric_definitions_self_access" on public.metric_definitions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "metric_readings_self_access" on public.metric_readings
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "daily_logs_self_access" on public.daily_logs
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "progress_photos_self_access" on public.progress_photos
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  public.profiles,
  public.event_focuses,
  public.external_accounts,
  public.planned_workouts,
  public.activities,
  public.metric_definitions,
  public.metric_readings,
  public.daily_logs,
  public.progress_photos
to authenticated;

create index if not exists planned_workouts_user_date_idx
  on public.planned_workouts (user_id, scheduled_date);
create index if not exists activities_user_date_idx
  on public.activities (user_id, activity_date desc);
create index if not exists metric_readings_metric_date_idx
  on public.metric_readings (metric_id, recorded_at desc);
create index if not exists daily_logs_user_date_idx
  on public.daily_logs (user_id, log_date desc);
