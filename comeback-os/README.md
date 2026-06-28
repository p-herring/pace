# Comeback OS

A private training dashboard for one athlete: upcoming training, the last 7 days of activity, bodyweight, key lifts, run/bike/swim benchmarks, custom event markers, daily water/calories, readiness, and optional progress photos.

## Local Dev

```bash
npm run dev -- --port 3001
```

Open `http://localhost:3001`.

## Supabase

The app runs in demo mode until Supabase env vars are added. Copy `.env.example` to `.env.local`, then fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Apply the schema in `supabase/migrations/202606130001_comeback_os.sql` to a fresh Supabase project.

## Integrations

COROS should be the primary device-health source if API access is approved. It can cover activity, daily summaries, sleep, HRV, and resting heart rate.

Strava can still use OAuth2 and the V3 API as an activity mirror or public/social proof source.

TrainingPeaks is adapter-ready, but the official API is restricted to approved commercial developers and is not available for personal use. COROS can receive the next 7 days of structured workouts from TrainingPeaks, but reading that plan back into this app still depends on COROS or TrainingPeaks API access. Until access exists, use manual entry or CSV/imported planned workouts.

## Training Plan Intake

Use `/training-plan` for the no-API path:

- Manual add for a single workout.
- CSV paste for a week or block of workouts.
- Required CSV columns: `date,title,sport`.
- Optional CSV columns: `duration_minutes,intensity`.

Future import adapters can normalize `.ics` calendar files, TrainingPeaks exports, or COROS/TrainingPeaks API responses into the same `planned_workouts` table.

## Suggested V1 Additions

- Readiness check-in and pain flag before training.
- Baseline date per marker so changes are meaningful.
- Public-share settings later, generated from selected private metrics.
- Manual import path for TrainingPeaks plans.
- Photo section hidden unless photos exist.
