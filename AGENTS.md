<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

BgLib is a single Next.js 16 (App Router) PWA whose backend is Supabase (Postgres + Auth + Realtime). For local dev we run Supabase locally via the Supabase CLI + Docker. Standard app commands (`npm run dev|lint|typecheck|build`) are in `README.md`; the update script already runs `npm install`.

Two services must be running to exercise the app end to end:
- Local Supabase stack (Docker containers) — the backend/API/auth/DB.
- Next.js dev server (`npm run dev`) at http://localhost:3000.

### Bringing up the backend (Docker + Supabase)

There is no systemd in this VM, so the Docker daemon must be started manually and does not survive a fresh VM start:
- Start it (e.g. in a tmux session): `sudo dockerd &` (logs to stdout). If you get `permission denied ... /var/run/docker.sock`, run `sudo chmod 666 /var/run/docker.sock` (the `ubuntu` user is in the `docker` group, but the group isn't active in already-open shells).
- Docker uses the `fuse-overlayfs` storage driver and `iptables-legacy` (configured during setup) — required for docker-in-docker here.

Then start Supabase from the repo root: `supabase start`. Docker volumes persist on the filesystem, so on later sessions the DB (schema + any data) usually comes back automatically; `supabase start` just re-launches the containers.

Get local URL/keys anytime with `supabase status -o env`. `.env.local` (gitignored) must contain `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from that output (they are the well-known static local-dev keys).

### Non-obvious gotchas

- `supabase/config.toml` sets `auto_expose_new_tables = true`. This is REQUIRED: the app's schema (`supabase/install.sql`) relies only on RLS policies and assumes the legacy Supabase behavior of auto-`GRANT`ing `public` tables to the `anon`/`authenticated` roles. Without this flag the local CLI's new default revokes those grants, so the Data API returns `permission denied for table ...` and, most visibly, new users get stuck in an infinite onboarding loop (group reads and the `onboarding_completed` profile update silently fail).
- Do NOT run `supabase db reset`. The repo's `supabase/migrations/*.sql` do not include the base `schema.sql`, so they cannot apply standalone. To initialize a fresh/empty DB, apply the canonical single-file schema instead: `docker exec -i supabase_db_workspace psql -U postgres -d postgres < supabase/install.sql`, then enable Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.games, public.loans, public.game_night_rsvps, public.plays, public.want_to_play;`. `install.sql` is idempotent-ish but is meant to run once per DB.
- Email confirmations are disabled locally (`auth.email.enable_confirmations = false`), so signup auto-logs the user in.
- The onboarding wizard's "Add a game manually" button links to `/add-game`, which middleware blocks until onboarding is complete — so it appears to bounce back. Finish onboarding via "Skip for now" → "Go to library", then add games.
- BGG search/import needs `BGG_API_TOKEN` (not set by default); the manual "Add game" form works without it (only Title is required).
- `npm run lint` has pre-existing errors in `src/components/BarcodeScanner.tsx` (`react-hooks/set-state-in-effect`); `npm run typecheck` and `npm run build` pass.
