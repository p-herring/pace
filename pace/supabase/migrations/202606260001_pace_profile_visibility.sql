-- Adds a public/private flag to the profile itself. Deliberately NOT wiring this to
-- "private profiles can only host private plans" yet — "private" plan visibility is
-- already a dead end today (pace_join_plan() explicitly rejects joining a private
-- plan, and there's no invite-acceptance flow), so gating private-profile users into
-- only that option would just relocate the existing dead-end onto a new rule instead
-- of fixing anything. That linkage needs a real invite mechanism built first.

alter table public.pace_profiles
  add column is_private boolean not null default false;
