# BGG collection import

This guide documents the BoardGameGeek (BGG) collection import flow exposed on
`/profile`.

## Intent

The importer turns a member's owned BGG collection into group catalogue entries
and ownership rows without duplicating games that the group already has. It is
designed for large collections: the browser previews the full collection, then
imports BGG IDs in small batches with visible progress.

## Primary codepaths

- `src/components/BggCollectionImport.tsx`
- `src/app/api/bgg/import/route.ts`
- `src/lib/bgg-import.ts`
- `src/lib/bgg.ts`
- `src/lib/duplicate-detection.ts`
- `src/lib/resolve-base-game.ts`
- `src/lib/link-expansions.ts`

## API workflow

`POST /api/bgg/import` supports two actions:

| Action | Request body | Behavior |
|--------|--------------|----------|
| `preview` | `{ "action": "preview", "username": "alice" }` | Fetches owned BGG board games and expansions, compares them with the active group's catalogue, links skipped duplicates to the current user's collection, and returns the BGG IDs still needing import. |
| `batch` | `{ "action": "batch", "bggIds": [174430, 167791] }` | Imports up to 10 BGG IDs server-side, linking ownership for duplicates found during the batch and creating new `games` rows for new items. |

The current client sends batches of 8 IDs (`BATCH_SIZE`) even though the route
accepts up to 10 (`MAX_BATCH_SIZE`). This leaves headroom for future UI changes
without changing the server guardrail.

The legacy username-only import request now returns a 400 response telling the
client to use `preview` and `batch`.

## Duplicate handling

Before importing, `loadExistingGameIndex` builds an active-group index by:

- exact `games.bgg_id`
- normalized title from `normalizeTitle`

When an imported item already exists:

1. The importer upserts an `ownership` row for the current user.
2. If the match was title-only and the existing row has no `bgg_id`, it backfills
   `games.bgg_id` and `games.bgg_type`.
3. The in-memory index is updated so later items in the same preview or batch do
   not re-import the same game.

The preview response counts duplicate skips by `bgg_id` and by `title`; the UI
shows those counts in the completion summary.

## Expansion linking

Imported BGG details include `bgg_type` and, for expansions, the first linked
base game's BGG ID. During insert:

- `resolveBaseGameId` links an expansion to a base game already present in the
  active group.
- If a base game is imported, `linkExpansionsToBaseByBggId` relinks existing
  orphan expansions that reference that base game's BGG ID.
- After all client batches finish, the UI calls
  `POST /api/games/relink-expansions` once to catch cross-batch ordering cases.

If the base game is not in the active group and cannot be imported in the same
run, the expansion remains an orphan expansion in the library until linked
manually or by a later import.

## Required configuration

BGG's XML API requires an application token. Set:

```bash
BGG_API_TOKEN=...
```

The token is read server-side by `src/lib/bgg.ts` and sent as
`Authorization: Bearer <token>`. Missing, invalid, or HTML error responses are
reported to the caller as BGG configuration/API errors.

## Operational checklist

When deploying or debugging the importer:

1. Confirm `BGG_API_TOKEN` is set in the runtime environment.
2. Confirm the user has an active group; the route returns `400` without one.
3. Use a BGG account with public owned items; collection lookup requests use
   `own=1` for both `boardgame` and `boardgameexpansion` subtypes.
4. Watch the UI summary for `failed` counts. A failed item usually means BGG did
   not return details for that ID or the insert failed.
5. Re-open `/library` after import; the profile page calls `router.refresh()`,
   but library grouping and offline cache refresh on a successful library load.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Import says BGG token is not configured | Set `BGG_API_TOKEN` in `.env.local` or the production runtime and restart the app. |
| BGG returns unauthorized or an HTML/JSON-looking error | Verify the token was generated at `https://boardgamegeek.com/applications` and copied without whitespace. |
| Large collection stops partway through | Retry the import. Existing games will be linked/skipped by BGG ID or title, so completed batches should not duplicate catalogue rows. |
| Existing manually-added game stays a duplicate | The normalized titles may not match. Merge duplicates from the game detail page if history should be preserved. |
| Imported expansion appears as "base not in library" | The base game is not present or could not be resolved by BGG ID; add/link the base game later. |
