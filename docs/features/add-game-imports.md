# Add-game imports: BGG and barcode

This guide documents the import paths that can pre-fill `/add-game` and the
profile BGG collection importer.

## Intent

BgLib lets users add games three ways:

1. **Manual entry**: only `title` is required.
2. **BoardGameGeek (BGG) search**: selects a BGG item and imports metadata.
3. **Barcode lookup**: scans or types a UPC/EAN, resolves it to a BGG ID, then
   imports the same BGG metadata.

Imported games are always created in the active group. When **Add to my
collection** is checked, the submit flow also inserts an `ownership` row for the
current user.

Primary codepaths:

- `src/app/add-game/page.tsx`
- `src/app/add-game/AddGameForm.tsx`
- `src/components/BggSearch.tsx`
- `src/components/BarcodeLookupPanel.tsx`
- `src/components/BarcodeScanner.tsx`
- `src/components/BggCollectionImport.tsx`

## Configuration

| Variable | Required for | Notes |
|----------|--------------|-------|
| `BGG_API_TOKEN` | BGG search, BGG detail lookup, collection import, barcode-to-BGG fallback | Register at <https://boardgamegeek.com/applications>. BGG returns HTML/401-style errors when the token is missing or invalid. |
| `GAMEUPC_API_TOKEN` | Optional barcode auto-match improvement | If unset, barcode lookup still checks the local library, shared UPC cache, free product-name lookups, and BGG search. |

Status endpoints:

- `GET /api/bgg/status` returns `{ configured: boolean }`.
- `GET /api/barcode/status` returns BGG/GameUPC readiness and mode.

Manual title entry does not require either token. In-app BGG search and barcode
selection do require `BGG_API_TOKEN`.

## BGG integration

Primary codepaths:

- `src/lib/bgg.ts`
- `src/lib/decode-html-entities.ts`
- `src/app/api/bgg/search/route.ts`
- `src/app/api/bgg/thing/route.ts`
- `src/app/api/bgg/import/route.ts`

`src/lib/bgg.ts` talks to `https://boardgamegeek.com/xmlapi2` with:

- `Authorization: Bearer <BGG_API_TOKEN>`
- `Accept: application/xml`
- `cache: "no-store"`

BGG can respond with `202 Accepted` while data is preparing. The shared fetch
helper retries up to six attempts with increasing one-second delays before
returning a timeout error that asks the user to try again in a moment.

The XML parser forces `item`, `name`, `link`, `poll`, and `result` nodes into
arrays so search results and thing details behave consistently for one or many
items. Text values are decoded through `decodeHtmlEntities`; BGG descriptions
also have simple HTML tags stripped before storage.

### API contracts

| Route | Auth | Input | Output / behavior |
|-------|------|-------|-------------------|
| `GET /api/bgg/search?q=<term>` | No app session required | Ignores missing or `<2` character queries and returns `[]`. | Up to 20 `{ id, name, yearPublished, type }` results for board games and expansions. |
| `GET /api/bgg/thing?id=<bggId>` | No app session required | Numeric BGG ID. | `{ id, name, description, minPlayers, maxPlayers, playTimeMinutes, imageUrl, yearPublished, bggType, baseGameBggId, expansionBggIds }`. |
| `POST /api/bgg/import` | Required | `{ "username": "bgg-user" }` | Imports owned collection items into the active group. |

All BGG route failures are returned as JSON with an `error` field. Upstream BGG
failures use `502`; invalid thing IDs use `400`.

## Add-game search flow

`BggSearch` debounces input by 400 ms, calls `/api/bgg/search`, and fetches
details from `/api/bgg/thing` after the user selects a result.

`AddGameForm` copies BGG details into editable form fields:

- title
- description
- min/max players
- play time
- cover image URL
- BGG ID and BGG type

Expansion handling:

- If `/add-game?base=<local-game-id>` is used, the new entry is treated as an
  expansion of that local base game.
- If the selected BGG item is a `boardgameexpansion`, the form tries to resolve
  `baseGameBggId` to a local game in the active group via
  `src/lib/resolve-base-game.ts`.
- If the base game is not in the group catalogue, the expansion is still saved
  and later appears as an orphan expansion.

## BGG collection import

`BggCollectionImport` lives on `/profile` and posts a BGG username to
`/api/bgg/import`.

Import behavior:

1. Requires an authenticated user and active group.
2. Fetches owned BGG collection items for both `boardgame` and
   `boardgameexpansion`.
3. Skips items whose `bgg_id` already exists in the active group.
4. Processes only the first 100 BGG collection items and returns
   `truncated: true` when more were available.
5. Sorts base games before expansions so expansion base-game resolution has the
   best chance to find a just-imported base game.
6. Inserts each game into `games` and upserts current-user ownership.

The response includes `{ imported, skipped, total, truncated }`.

## Barcode lookup pipeline

Primary codepaths:

- `src/lib/barcode.ts`
- `src/lib/barcode-detector.ts`
- `src/lib/barcode-lookup.ts`
- `src/lib/gameupc.ts`
- `src/lib/upc-product-lookup.ts`
- `src/app/api/barcode/lookup/route.ts`
- `src/app/api/barcode/map/route.ts`
- `src/app/api/barcode/status/route.ts`
- `supabase/migrations/009_barcode_upc.sql`

The scanner uses the browser `BarcodeDetector` API for live scanning where
available (Chrome, Edge, Android). Unsupported browsers and camera failures fall
back to typing the barcode. Barcodes are normalized to digits only and must be
8-14 digits.

Lookup order for `GET /api/barcode/lookup?upc=<digits>`:

1. Require an authenticated user.
2. Normalize and validate the UPC/EAN.
3. If an active group is available, check `games.upc` for an existing game in
   that group and return a duplicate warning.
4. Check the shared `upc_bgg_mappings` cache.
5. If `GAMEUPC_API_TOKEN` is set, query GameUPC using UPC-A/EAN-13 variants.
6. If `BGG_API_TOKEN` is set, query free product-name sources
   (`upcitemdb`, then Open Food Facts), clean the title, and search BGG.
7. Return one direct BGG match, a candidate list, or a manual-search prompt.

When lookup finds a BGG ID, `/api/barcode/lookup` upserts it into
`upc_bgg_mappings`. When the user chooses a candidate or manual BGG result, the
client posts to `/api/barcode/map` to save the confirmed mapping with
`source = "user"`.

### Barcode data model

Migration `009_barcode_upc.sql` adds:

| Table / column | Purpose |
|----------------|---------|
| `games.upc` | Stores the scanned UPC/EAN on the group game entry. |
| `games_upc_idx` | Partial index for duplicate checks when `upc` is present. |
| `upc_bgg_mappings.upc` | Shared UPC/EAN key. |
| `upc_bgg_mappings.bgg_id` | Confirmed BGG target. |
| `upc_bgg_mappings.title` | Optional display title from the lookup source or user selection. |
| `upc_bgg_mappings.source` | Source label such as `gameupc`, `bgg_search`, or `user`. |

Authenticated users can read, insert, and update UPC mappings. The mapping cache
is intentionally not group-scoped so future scans can benefit from prior
confirmations.

## Operational checklist

When deploying or debugging imports:

1. Set `BGG_API_TOKEN` anywhere BGG search, collection import, or barcode lookup
   should work.
2. Optionally set `GAMEUPC_API_TOKEN` to improve direct barcode matches.
3. Confirm migration `009_barcode_upc.sql` has run, or use the generated
   `supabase/install.sql` for fresh projects.
4. Check `/api/bgg/status` and `/api/barcode/status` after changing env vars.
5. Restart the Next.js server after editing `.env.local` or production env.
6. Test manual title entry separately from BGG/barcode imports; it should work
   without external API tokens.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| BGG search returns an HTML/JSON parse style error | `BGG_API_TOKEN` is missing, invalid, or the server was not restarted after setting it. |
| BGG search returns no results | Query must be at least two characters; BGG results are limited to board games and expansions. |
| BGG detail lookup times out | BGG may be returning `202 Accepted`; retry after a moment. |
| Imported text shows encoded apostrophes or numeric entities | Check `src/lib/decode-html-entities.ts`; all BGG name/description paths should use it. |
| Barcode live scan is unavailable | Browser may not support `BarcodeDetector`, or camera permission failed. Type the UPC/EAN manually. |
| Barcode says the game is already in the library | A game in the active group already has that `games.upc`. Open the existing game instead of adding a duplicate. |
| Barcode finds product text but no BGG game | Use the manual BGG search shown after scan; the confirmed selection is saved to `upc_bgg_mappings`. |
| Barcode lookup works once but not after env changes | Restart the server so Next.js reads the updated token values. |
