-- Split into its own migration deliberately: ALTER TYPE ... ADD VALUE cannot be
-- safely used in the same transaction as code that references the new value, and
-- migrations run as a single transaction. The functions/policies that actually use
-- 'invited' live in the next migration file.

alter type public.pace_participant_status add value if not exists 'invited';
