# Database setup

## Quick install (recommended)

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard)
2. Paste the entire contents of **`install.sql`** and run it
3. Enable Realtime replication (see below)

To regenerate `install.sql` after editing migrations:

```bash
npm run db:build
```

## Manual install

Run these files **in order** if you prefer step-by-step:

| Order | File | Contents |
|-------|------|----------|
| 1 | `schema.sql` | Profiles, games, ownership, base RLS |
| 2 | `migrations/002_extensions.sql` | Game nights, loans, push subscriptions |
| 3 | `migrations/003_priority_features.sql` | Groups, plays, group scoping |
| 4 | `migrations/004_tier1_features.sql` | Want-to-play, email prefs, edit policies |
| 5 | `migrations/005_rls_hardening.sql` | Tighter RLS for nights and ownership |
| 6 | `migrations/006_fix_group_members_rls.sql` | Fix infinite recursion on group_members |
| 7 | `migrations/007_fix_group_create_rls.sql` | Fix group creation RLS + create_group RPC |
| 8 | `migrations/008_expansions.sql` | Base/expansion links and play expansions |
| 9 | `migrations/009_barcode_upc.sql` | UPC fields and UPC-to-BGG mapping cache |
| 10 | `migrations/010_play_winners_stats.sql` | Play winners, scores, and first-time flags |

For existing projects, run only the migrations you have not applied yet, in
order. Fresh projects can use `install.sql`, which already includes all
migrations above.

## Enable Realtime

In Supabase Dashboard → **Database** → **Replication**, enable Realtime for:

- `games`
- `loans`
- `game_night_rsvps`
- `plays`
- `want_to_play`

## Notes

- SQL files are **run once** per project. Re-running may fail on existing triggers/policies.
- New signups automatically get a default group and profile (via `handle_new_user` trigger).
- Existing users running migration `003` get backfilled groups and `onboarding_completed = true`.
- Feature behavior for migrations `008` and `010` is documented in
  [`../docs/features/library-plays-picker.md`](../docs/features/library-plays-picker.md).
