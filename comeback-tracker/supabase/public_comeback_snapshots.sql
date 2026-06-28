create table if not exists public.public_comeback_snapshots (
  id uuid primary key default gen_random_uuid(),
  week_number integer not null check (week_number >= 1),
  recorded_on date not null default current_date,
  bodyweight_kg numeric(5, 2),
  bodyweight_change_kg numeric(5, 2),
  run_pace_seconds_per_km integer check (run_pace_seconds_per_km is null or run_pace_seconds_per_km > 0),
  run_label text not null default 'Run pace',
  sessions_completed integer not null default 0 check (sessions_completed >= 0),
  lift_squat_kg numeric(6, 2),
  lift_squat_change_kg numeric(6, 2),
  lift_bench_kg numeric(6, 2),
  lift_bench_change_kg numeric(6, 2),
  lift_deadlift_kg numeric(6, 2),
  lift_deadlift_change_kg numeric(6, 2),
  source_label text not null default 'Manual update',
  source_url text,
  note text not null,
  next_checkpoint text,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists public_comeback_snapshots_published_idx
  on public.public_comeback_snapshots (is_published, recorded_on desc, created_at desc);

alter table public.public_comeback_snapshots enable row level security;

drop policy if exists "public_comeback_snapshots_public_read" on public.public_comeback_snapshots;
create policy "public_comeback_snapshots_public_read"
on public.public_comeback_snapshots for select
to anon, authenticated
using (is_published = true);

grant select on public.public_comeback_snapshots to anon, authenticated;

insert into public.public_comeback_snapshots (
  week_number,
  recorded_on,
  bodyweight_kg,
  bodyweight_change_kg,
  run_pace_seconds_per_km,
  run_label,
  sessions_completed,
  lift_squat_kg,
  lift_squat_change_kg,
  lift_bench_kg,
  lift_bench_change_kg,
  lift_deadlift_kg,
  lift_deadlift_change_kg,
  source_label,
  note,
  next_checkpoint
)
values (
  7,
  current_date,
  91.8,
  -3.4,
  342,
  'Zone 2 run',
  26,
  125,
  10,
  87.5,
  2.5,
  155,
  15,
  'Manual session log',
  'Back-to-back training weeks completed without missing a key session.',
  'Retest 5 km pace after Saturday strength.'
);
