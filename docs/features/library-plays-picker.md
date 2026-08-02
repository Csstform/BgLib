# Library, plays, stats, and picker

This guide documents how BgLib connects the group catalogue, catalogue
management, expansions, play logging, stats, offline browsing, and the game
picker.

## Intent

These features share one data loop:

1. The group maintains a catalogue in `games` and ownership in `ownership`.
2. Members log plays in `plays`, participants in `play_participants`, and any
   expansions used in `play_expansions`.
3. `/stats` summarizes play history and winners.
4. `/picker` uses ownership, attendance, wants, and play history to suggest
   games that can actually be played.

All queries are scoped to the active group. Row Level Security should keep group
data visible only to members.

## Data model

| Table / column | Purpose |
|----------------|---------|
| `games.base_game_id` | Optional self-reference from an expansion to its base game. |
| `games.bgg_type` | BGG type: `boardgame` or `boardgameexpansion`. |
| `play_expansions` | Join table from a logged play to expansion games used in that play. |
| `plays.first_time_played` | User-marked flag for a group's first play of a game. |
| `play_participants.is_winner` | Supports zero, one, or multiple winners for a play. |
| `play_participants.score` | Optional integer score per participant. |

Schema changes live in:

- `supabase/migrations/008_expansions.sql`
- `supabase/migrations/010_play_winners_stats.sql`

Migration `009_barcode_upc.sql` adds UPC lookup fields for the Add Game flow.
Barcode scan uses the shared `upc_bgg_mappings` cache plus BGG search — `BGG_API_TOKEN`
is required; `GAMEUPC_API_TOKEN` is optional.

## Library workflow

Primary codepaths:

- `src/app/library/page.tsx`
- `src/app/library/LibraryClient.tsx`
- `src/lib/game-expansions.ts`
- `src/lib/library-filters.ts`
- `src/lib/offline-library.ts`

The library page loads all games for the active group, ownership details, and the
latest play date per game. The client can show:

- **Grouped view**: base games with linked expansions nested below them.
- **Flat view**: all catalogue entries in one list, with expansion badges.
- **Orphan expansions**: expansions whose base game is not in the group library.

Filters are applied client-side after the server load:

| Filter | Behavior |
|--------|----------|
| Owner | Keeps games owned by the selected member. |
| I own | Keeps games owned by the current user. |
| No owners | Keeps catalogue entries without ownership rows. |
| Min players | Keeps games whose `max_players` can support that count. |
| Max players | Keeps games whose `min_players` fits that count. |
| Max play time | Keeps games at or below the supplied minutes when play time is known. |
| Never played | Excludes games that have a recorded play in the active group. |

When the browser receives a successful library load, it caches the group library
in IndexedDB database `bglib-offline`, store `libraries`, keyed by `groupId`.
If the browser later reports offline status, the library page shows cached data
with the cache timestamp. Offline cache is browsing-only; mutations still need
the network.

## Catalogue management

Primary codepaths:

- `src/app/library/[id]/page.tsx`
- `src/components/EditGameForm.tsx`
- `src/components/MergeGamesPanel.tsx`
- `src/components/DeleteGameButton.tsx`
- `src/app/api/games/[id]/route.ts`
- `src/app/api/games/merge/route.ts`

Authenticated group members manage a catalogue entry from the game detail page's
**Manage game details** section:

| Action | API route | Behavior |
|--------|-----------|----------|
| Edit details | `PATCH /api/games/[id]` | Updates title, description, player counts, play time, and cover image URL for the active-group game. |
| Merge duplicate | `POST /api/games/merge` | Keeps the selected entry, moves ownership, loans, plays, play-expansion links, linked expansions, and want-to-play rows from duplicate entries, then deletes the duplicates. |
| Remove from library | `DELETE /api/games/[id]` | Permanently deletes the game row after confirming the game belongs to the user's active group. |

Use **merge** when the group has two records for the same game and history should
be preserved. Use **Remove from library** only when the catalogue entry and its
history should be discarded; there is no undo or soft-delete table.

Delete behavior comes from database foreign keys:

- `ownership`, `game_night_games`, `loans`, `plays`, `want_to_play`, and
  `play_expansions` rows referencing the game cascade away.
- `play_participants` rows cascade through deleted `plays`.
- Expansions that reference the removed game through `games.base_game_id` are
  kept, but their `base_game_id` is set to `null`, so they appear as orphan
  expansions until linked to another base game.

The API routes check the current user's active group before mutating data. RLS
also requires the user to be a member of the game's group; the delete policy was
introduced in `supabase/migrations/004_tier1_features.sql`.

## Expansions workflow

Primary codepaths:

- `src/app/library/[id]/page.tsx`
- `src/components/AddExpansionLink.tsx`
- `src/app/add-game/page.tsx`
- `src/app/add-game/AddGameForm.tsx`
- `src/lib/resolve-base-game.ts`

Users can add an expansion from a base game's detail page. The link passes
`/add-game?base=<base-game-id>`, which pre-fills the base relationship and marks
the new entry as an expansion.

BGG-selected expansion entries can also resolve their base game automatically
when the base game's BGG ID is present in the local group catalogue. If the base
game is missing, the expansion remains visible as an orphan expansion until the
base game is added.

## Play logging and stats

Primary codepaths:

- `src/app/plays/new/page.tsx`
- `src/app/plays/LogPlayForm.tsx`
- `src/app/plays/page.tsx`
- `src/app/stats/page.tsx`

The play logging form accepts:

- Base game only; expansion entries are not selectable as the primary game.
- Linked expansions used during the play.
- Participants from the active group.
- Optional winners. Multiple winners are allowed for ties or cooperative wins.
- Optional per-participant scores.
- Optional duration, notes, and `first_time_played` flag.

The play history page shows the 50 most recent plays for the group with
participants, winner markers, scores, expansion titles, notes, and logger.

The stats page currently reports:

- Total plays.
- Unique games played.
- Plays since the first day of the current month.
- Top 8 most-played games.
- Top 8 winners, based on `play_participants.is_winner`.

Stats are read-only summaries and do not currently expose score leaderboards or
first-time-played counts.

## Picker behavior

Primary codepaths:

- `src/app/api/picker/route.ts`
- `src/app/picker/PickerClient.tsx`
- `src/lib/picker-scoring.ts`

`GET /api/picker` accepts these query parameters:

| Parameter | Example | Behavior |
|-----------|---------|----------|
| `players` | `4` | Player count; defaults to `2` when omitted. |
| `max_time` | `90` | Optional maximum play time in minutes. |
| `attendees` | `uuid-1,uuid-2` | Optional comma-separated user IDs for people present. |
| `want_to_play` | `1` | Only include games wanted by at least one relevant attendee. |
| `random` | `1` | Return one random result from the top 5 ranked games. |

Candidate rules:

1. Exclude expansions as primary games (`base_game_id` set or
   `bgg_type = boardgameexpansion`).
2. Exclude games with no owners.
3. When attendees are supplied, keep only games owned by at least one attendee.
4. Keep games whose player range contains `players`.
5. Apply `max_time` when the game has `play_time_minutes`.
6. Count `want_to_play` rows across attendees, or across the group when
   attendees are omitted.
7. Surface owned expansions for the base game, limited to attendee-owned
   expansions when attendees are supplied.

The default scoring weights are:

| Signal | Points |
|--------|--------|
| Never played in the group | `100` |
| Played before but not in the last 180 days | `50` |
| At least one relevant person wants to play it | `30` |

Results sort by `picker_score` descending. Ties prefer games that have never
been played, then games with the oldest `last_played_at`.

Example:

```text
/api/picker?players=4&max_time=90&attendees=<alice>,<bob>&want_to_play=1
```

This returns owned base games for 4 players, no longer than 90 minutes, owned by
Alice or Bob, and wanted by at least one of them.

## Operational checklist

When deploying or debugging this feature cluster:

1. Confirm the database has run migrations `008` through `010`; fresh installs
   via `supabase/install.sql` already include them.
2. Enable Supabase Realtime for `games`, `plays`, and `want_to_play` as listed in
   `supabase/README.md`.
3. Log at least one play with participants and a winner before validating
   `/stats`.
4. Add ownership rows before testing the picker; unowned games are excluded.
5. Visit `/library` once while online before expecting offline cached browsing.
6. Prefer merging duplicate games before deleting them if ownership, play
   history, loans, wants, or game-night suggestions should survive.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Expansion appears under "base not in library" | The expansion has no `base_game_id`, or the referenced base game is not in the active group. |
| Expansion became orphaned after removing a base game | Expected when the base game's row is deleted; relink the expansion from another base game or edit it as needed. |
| Expansion cannot be picked as the main game | Expected behavior; log the base game and select expansions used. |
| Picker returns no games | Verify at least one attendee owns a matching base game, player count fits, `max_time` is not too strict, and `want_to_play=1` has matching wants. |
| Picker ignores an expansion | Expansions are shown as metadata for eligible base games, not standalone candidates. |
| Stats show no winners | Winners are counted only from plays where participants were marked with `is_winner`. |
| Offline library shows old data | The cache is updated only after a successful online `/library` load for that group. |
| Removed game disappeared from plays, loans, or game nights | Expected: removal deletes the game and cascades dependent records. Use duplicate merge instead when those records need to be preserved. |
