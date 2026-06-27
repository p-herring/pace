# Pace beta setup

This application should use a **new Supabase project**. Do not apply the legacy coach/athlete migration to it.

## Free-tier architecture

Pace beta uses Supabase Auth, Postgres, Realtime and Storage only. The schema deliberately avoids a paid geospatial extension and stores rounded discovery coordinates for indexed map searches. It is suited to a small, single-city beta—not an uncontrolled nationwide launch.

Maps are a separate presentation concern: use MapLibre with an appropriate tile/geocoding provider. Keep its key in server-side environment variables where possible and never make map-provider responses a source of truth for access control.

## Create the project

1. Create a new Supabase project named `pace-beta` in the closest practical region.
2. In SQL Editor, run the migrations in `supabase/migrations/` in filename order: `202606230001_pace_beta.sql` (initial schema), `202606230002_pace_beta_hardening.sql` (advisor follow-up), `202606240001_pace_email_verification_sync.sql` (keeps email verification in sync — required before anyone can host or join a plan), and `202606240002_pace_account_deletion.sql` (required for in-app account deletion).
3. In Data API settings, expose the listed `pace_*` tables to authenticated users if your project does not automatically expose new public tables. The migration grants `authenticated` database privileges and enables RLS on every exposed table.
4. In Database Publications, confirm the four Pace tables are in `supabase_realtime`: plans, plan participants, plan messages and notifications.
5. Add the new project URL and publishable key to the web app environment:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=keep-server-only
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Auth and verification

- Enable email/password sign-up and require email confirmation.
- Add your local and production callback URLs to Auth redirect URLs.
- Configure CAPTCHA and conservative Auth rate limits before sharing beta links. The app also applies its own per-IP rate limits to sign-in, sign-up and password-reset (`src/lib/rate-limit.ts`) — that's a beta-scale, in-memory baseline, not a replacement for Supabase's own limits.
- Email verification is supported by Supabase itself. `pace_profile_private.email_verified_at` is kept in sync automatically by a Postgres trigger (`202606240001_pace_email_verification_sync.sql`) — no app-level action is required for this.
- Phone verification requires an SMS/WhatsApp provider such as Twilio, Vonage, MessageBird or TextLocal. **That delivery service is outside Supabase’s free tier.** It is intentionally out of scope for this closed beta. Email verification plus manually approved invite codes is the safe cost-free substitute.

## Production safety checklist before invitations

- Review every RLS policy with the Supabase security advisor after the migration is live.
- Test with four accounts: host, confirmed participant, waitlisted participant and unrelated user.
- Verify unrelated users cannot read a private plan, participant list, plan chat or private location.
- Verify public discovery rows never include exact location/address fields.
- Configure a monitored support address and a human report-review rota.
- Add a privacy policy, terms of use and the Pace policies to the public site. Drafts of the community policy (`/policies`) and privacy policy (`/privacy`) exist now — neither has had a legal review yet.
- Confirm account deletion (`/pace/account/delete`) actually removes a test account end-to-end on your project before relying on it for real users.
- Set the first cohort to Perth, 18+, invite-only and human-approved. Keep hosting enabled only after profile/safety completion.

## Beta exit criteria

You are ready to start a controlled beta when these are true:

- New user can sign up, verify email, complete onboarding and accept policies.
- User can create, discover, join, leave, waitlist and cancel a plan with the expected live updates.
- A confirmed participant sees exact meeting details; a non-participant never does.
- Plan chat, notifications, report and block flows work end-to-end.
- An administrator can triage a serious safety report and temporarily suspend an account.
- You have tested the path on a real phone and can reach beta support while a plan is in progress.
