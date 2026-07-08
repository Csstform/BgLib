# Barcode and UPC lookup

This guide documents the Add Game barcode flow: scanning or typing a UPC/EAN,
matching it to BoardGameGeek, and remembering confirmed mappings for future
adds.

## Intent

Barcode lookup should make common adds fast without requiring every deployment
to pay for a barcode database:

1. Prefer games already in the active group library.
2. Reuse the shared UPC-to-BGG cache when another user has confirmed a match.
3. Use an optional GameUPC token when available.
4. Fall back to free product-name lookup plus BGG search.
5. Let the user manually search BGG and save the mapping when automation cannot
   choose safely.

The feature never creates a game directly. It only fills the Add Game form with
BGG details and a normalized `upc`; the normal form submit inserts the game.

## Data model

| Table / column | Purpose |
|----------------|---------|
| `games.upc` | Stores the normalized UPC/EAN on the group catalogue entry. Used to detect that a scanned box is already in the active group. |
| `upc_bgg_mappings.upc` | Global normalized UPC/EAN key. |
| `upc_bgg_mappings.bgg_id` | BoardGameGeek object ID selected for the barcode. |
| `upc_bgg_mappings.title` | Optional display title captured from the lookup or user selection. |
| `upc_bgg_mappings.source` | Origin of the mapping, such as `gameupc`, `bgg_search`, or `user`. |
| `upc_bgg_mappings.updated_at` | Last time the mapping was inserted or refreshed. |

Schema changes live in `supabase/migrations/009_barcode_upc.sql`.
Authenticated users can read, insert, and update UPC mappings. The mapping table
is intentionally not group-scoped; `games.upc` remains group-scoped through the
normal `games` row.

## Primary codepaths

| Area | Files |
|------|-------|
| Add Game UI | `src/app/add-game/AddGameForm.tsx`, `src/components/BarcodeLookupPanel.tsx`, `src/components/BarcodeScanner.tsx` |
| Barcode APIs | `src/app/api/barcode/lookup/route.ts`, `src/app/api/barcode/map/route.ts` |
| Lookup helpers | `src/lib/barcode.ts`, `src/lib/barcode-lookup.ts`, `src/lib/gameupc.ts`, `src/lib/upc-product-lookup.ts` |
| BGG import | `src/app/api/bgg/search/route.ts`, `src/app/api/bgg/thing/route.ts`, `src/lib/bgg.ts` |
| Duplicate surfacing | `src/components/DuplicateWarning.tsx`, `src/lib/duplicate-detection.ts` |

## API contracts

### `GET /api/barcode/lookup?upc=<digits>`

Requires an authenticated user. The route normalizes the supplied UPC/EAN to
digits only and rejects values outside 8-14 digits.

Typical responses:

| Shape | Meaning |
|-------|---------|
| `{ upc, source: "library", duplicate }` | A game in the active group already has this `games.upc`; the UI warns instead of importing. |
| `{ upc, source: "cache", bggId, name, candidates: [], needsManualSearch: false }` | The global mapping table has a saved BGG ID. |
| `{ upc, bggId, name, source, candidates, needsManualSearch: false }` | Automatic lookup found a single usable BGG ID. |
| `{ upc, candidates, message, needsManualSearch: false }` | Lookup found several possible BGG matches; the user must choose one. |
| `{ upc, source: "manual", needsManualSearch: true, message }` | Automation could not resolve a match; the UI opens manual BGG search. |

Errors are JSON with `error` and use `401` for unauthenticated users, `400` for
invalid barcodes, and `502` when an upstream lookup fails.

### `POST /api/barcode/map`

Requires an authenticated user. Body:

```json
{ "upc": "3558380106939", "bggId": 68448, "title": "7 Wonders" }
```

The route normalizes `upc`, validates that `bggId` is numeric, and upserts
`upc_bgg_mappings` with `source: "user"`. The Add Game UI calls this whenever a
user picks a candidate or manual BGG search result.

## Lookup order

`GET /api/barcode/lookup` follows this sequence:

1. **Active group duplicate check**: if `games.upc` matches in the active group,
   return `source: "library"` and the duplicate game summary.
2. **Global cache**: if `upc_bgg_mappings` has a `bgg_id`, return it without
   calling external services.
3. **GameUPC**: when `GAMEUPC_API_TOKEN` is set, query GameUPC for UPC-A and
   EAN-13 variants. A verified or first candidate can resolve the scan.
4. **BGG availability check**: if `BGG_API_TOKEN` is missing, return manual mode
   because BGG search and details cannot run.
5. **Free product-name lookup**: try UPCItemDB's trial API, then Open Food Facts.
   Product titles are cleaned before BGG search.
6. **BGG search**: search board games and expansions. One result auto-selects;
   multiple results become user-facing candidates; zero results falls back to
   manual BGG search.

When an automatic result has a `bggId`, the route upserts `upc_bgg_mappings`
with the result source before returning.

## Client workflow

1. `/add-game` renders the import section with a barcode button and BGG search.
2. `BarcodeScanner` tries the browser `BarcodeDetector` API with the environment
   camera. If unsupported or unavailable, users can type the barcode manually.
3. `BarcodeLookupPanel` calls `/api/barcode/lookup`.
4. If the response has `duplicate`, the panel shows an error and leaves the form
   unchanged.
5. If the response has one `bggId`, the panel loads details from
   `/api/bgg/thing?id=<id>` and fills the form.
6. If there are candidates, the user chooses one; if manual mode is needed, the
   user searches `/api/bgg/search?q=<title>` and chooses a result.
7. Candidate/manual choices call `/api/barcode/map`, then load BGG details and
   set the form's `upc`.
8. Submitting the Add Game form inserts `games.upc` with the rest of the game
   details and optionally creates the current user's ownership row.

Expansion behavior is shared with normal BGG import: BGG expansion results set
`bgg_type = boardgameexpansion` and try to resolve `base_game_id` against the
active group's existing base games.

## Environment variables

| Variable | Required? | Effect |
|----------|-----------|--------|
| `BGG_API_TOKEN` | Required for BGG search/details | Enables `/api/bgg/search`, `/api/bgg/thing`, BGG collection import, and barcode fallback/manual search. |
| `GAMEUPC_API_TOKEN` | Optional | Adds a direct barcode-to-BGG lookup before the free product-name fallback. |

Without `GAMEUPC_API_TOKEN`, barcode lookup can still work through the global
cache or product-name-to-BGG fallback. `BGG_API_TOKEN` is required to load BGG
details into the form, so even cached or GameUPC matches cannot complete an
import without it; active-library duplicate detection is the only fully useful
barcode path when BGG is not configured.

## Operational checklist

When deploying or debugging barcode lookup:

1. Confirm migration `009_barcode_upc.sql` has run; fresh installs through
   `supabase/install.sql` already include it.
2. Set `BGG_API_TOKEN` anywhere Add Game import is expected to work.
3. Optionally set `GAMEUPC_API_TOKEN` to improve direct scan hit rate.
4. Test both camera scanning and manual barcode entry; not all browsers expose
   the `BarcodeDetector` API.
5. Scan the same UPC twice after saving a game to confirm the active-library
   duplicate warning appears.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| "Live scanning is not supported" | Expected on browsers without `BarcodeDetector`; type the UPC/EAN manually. |
| Scan says the game is already in the library | A `games.upc` row in the active group matched; open the existing game instead of adding another copy. |
| Lookup asks for manual BGG search | The UPC was not cached and automatic product-name lookup could not choose a single BGG result. |
| BGG search or import returns an HTML/JSON error | Set a valid `BGG_API_TOKEN` and restart/redeploy so server routes see it. |
| GameUPC never appears to be used | `GAMEUPC_API_TOKEN` is unset, invalid, or the service did not return a usable BGG ID/candidate. The flow falls through to free lookup. |
| Duplicate panel groups games by barcode | Multiple catalogue entries share `games.upc`; use the library duplicate panel to merge them. |
