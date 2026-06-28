# Comeback Tracker

A standalone public proof-of-work page for a personal training comeback.

The first version intentionally runs from `data/comeback.json` so the stats can be updated after a session without touching a larger coaching app. When it is ready to go live from Supabase, use `supabase/public_comeback_snapshots.sql` as the public-read snapshot table.

## Run Locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Update A Session

Edit `data/comeback.json`:

- `snapshot` controls the hero tracker.
- `history` controls the recent-weeks cards.

## Later Supabase Switch

The included SQL creates a public, RLS-enabled read table. Writes should happen through the Supabase dashboard, SQL editor, or a private admin workflow rather than from the public page.
