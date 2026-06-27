# Pace

Pace is a Perth beta product for finding people to run, ride or swim with in public
places. Hosts post a plan (sport, time, distance, pace, meeting point), other members
discover and join it, and exact meeting details only unlock once a join is confirmed.

This was originally scaffolded as a coach/athlete training platform called Trackline.
That product has been removed — this repo is Pace, and Pace only.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth + Postgres (Row Level Security on every table)
- Leaflet / React-Leaflet for the marketing-page map
- OpenStreetMap Nominatim for geocoding plan locations (free tier — see the note below)
- Vitest for unit tests

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add a `.env.local` (see [Environment](#environment) below).
3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=keep-server-only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the newer Supabase key format) is preferred;
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback. `NEXT_PUBLIC_PACE_SUPABASE_URL`
/ `NEXT_PUBLIC_PACE_SUPABASE_PUBLISHABLE_KEY` also work if you'd rather namespace the
vars explicitly (see `src/lib/env.ts`).

`SUPABASE_SERVICE_ROLE_KEY` is required for account deletion (`/pace/account/delete`),
which uses the Auth admin API. Keep it server-side only — never expose it with a
`NEXT_PUBLIC_` prefix.

Without a configured Supabase project, the app still renders — every server action and
data-fetching route checks for configuration first and shows an in-context "not
connected yet" message instead of crashing.

## Database setup

See [`docs/PACE_BETA_SETUP.md`](docs/PACE_BETA_SETUP.md) for the full walkthrough. In
short, run the migrations in `supabase/migrations/` **in filename order**:

1. `202606230001_pace_beta.sql` — initial schema (profiles, plans, groups, messages,
   reports, blocks, notifications, all with RLS).
2. `202606230002_pace_beta_hardening.sql` — follow-up grants/policy/index cleanup from
   a Supabase advisor pass.
3. `202606240001_pace_email_verification_sync.sql` — a trigger that keeps
   `pace_profile_private.email_verified_at` in sync with Supabase Auth's own
   `email_confirmed_at`. Without this, no one can host or join a plan (the RLS checks
   require a verified email, and nothing else sets that column) — see the comment in
   the migration for the full story.
4. `202606240002_pace_account_deletion.sql` — a `security definer` RPC that clears the
   two `RESTRICT` foreign keys (`pace_plans.host_id`, `pace_groups.owner_id`) so an
   account can actually be deleted via the Auth admin API afterward.

Then: enable email/password sign-up with email confirmation required, add your local
and production URLs to Auth → Redirect URLs, and paste
[`docs/PACE_CONFIRMATION_EMAIL.html`](docs/PACE_CONFIRMATION_EMAIL.html) into the
Supabase "Confirm signup" email template.

## Current behaviour

- Sign up → verify email → onboarding (profile, sports, safety + terms acknowledgement) →
  the live plan feed.
- Hosts post a plan with a sport, time, distance/pace target, suburb, public meeting
  point, capacity, visibility and approval setting. Both the public discovery point and
  the exact (participants-only) meeting point are geocoded for real via OpenStreetMap
  Nominatim, looked up separately so the coarse public point is never just a truncated
  version of the precise one.
- Members discover plans, join instantly or request approval, and are waitlisted FIFO
  once a plan is full.
- Exact meeting location is only visible to the host and confirmed participants — public
  listings only ever show the suburb.
- Members can report a plan (`/pace/report/[planId]`) for a beta admin to review.
- Members can delete their own account (`/pace/account/delete`) — this cancels any plans
  they're hosting (and notifies anyone who'd joined), then permanently removes their
  profile, plans, messages and notifications via the Auth admin API.
- Sign-in, sign-up and password-reset are rate-limited per IP (in-memory — see the
  caveat in `src/lib/rate-limit.ts`; this is a beta-scale baseline, not a substitute for
  Supabase's own configurable Auth rate limits).
- `/policies` is the public community & safety policy page; the full policy text lives in
  [`docs/PACE_BETA_POLICIES.md`](docs/PACE_BETA_POLICIES.md). `/privacy` is a working
  draft privacy policy reflecting actual data flows — **not yet legally reviewed.**

## Testing

```bash
npm test        # run once
npm run test:watch
```

Current coverage is the pure/testable logic — the redirect-safety helpers (including a
regression test for the open-redirect bug this replaced), the rate limiter, and the
geocoding helper (mocked `fetch`, since Nominatim can't be hit from most CI sandboxes).
There's no integration test against a real Supabase project yet — that needs a
disposable test project and isn't something this repo sets up for you automatically.

## Notable routes

- `/` — marketing/landing page
- `/policies` — community & safety policy
- `/privacy` — privacy policy (draft)
- `/pace` — the signed-in plan feed (protected)
- `/pace/sign-up`, `/pace/sign-in`
- `/pace/forgot-password`, `/pace/update-password`
- `/pace/check-email` — post-signup verification checkpoint
- `/pace/onboarding` — profile, sports and safety acknowledgement (protected)
- `/pace/new` — host a plan (protected)
- `/pace/report/[planId]` — report a plan (protected)
- `/pace/account`, `/pace/account/delete` — account settings and deletion (protected)
- `/auth/callback` — Supabase email/recovery link handler

## Not yet built

- **Blocking and a full reporting surface.** `/pace/report/[planId]` covers reporting a
  plan/host from the feed using the existing `pace_reports` table. There's no UI yet for
  blocking another member, and no admin/moderation view for triaging reports — the
  schema (`pace_blocks`, `pace_audit_events`) supports both, but a real version of either
  needs a plan-detail/participants view that doesn't exist yet.
- **Plan chat.** `pace_plan_messages` exists in the schema; no UI yet.
- **Phone verification** (intentionally deferred — see `docs/PACE_BETA_POLICIES.md`).
- **A packaged mobile app.** This is a web app; there's no Capacitor/React Native/PWA
  wrapper, app icons, or store listing assets. Submitting to the App Store / Play Store
  is a separate project with its own decisions (which wrapper path, design assets, an
  actual developer account) that need to happen before "implement App Store readiness"
  is something code changes alone can finish.
- **Legal review of `/privacy` and `/policies`.** Both are accurate drafts of current
  behaviour, not reviewed legal documents.
