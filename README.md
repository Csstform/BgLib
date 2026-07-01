# BgLib — Board Game Library

A mobile-first PWA for iOS and Android: a shared board game catalogue, ownership tracker, and game-night planner for friend groups.

## Features

- **Gaming groups** — Separate libraries per group with invite codes
- **Shared catalogue** — Title, players, play time, cover image; BGG search on add
- **Ownership tracking** — See who owns what in your active group
- **Game picker** — Filter by players, time, and attendees; prioritizes least-recently played
- **Play logging** — Session history for your group
- **Game nights** — Schedule, RSVP, suggest games from attendees marked Going
- **Loans** — Request, approve, return; due-date reminders via cron
- **Want to play** — Mark interest on game detail pages
- **Edit & merge** — Fix catalogue entries and combine duplicates
- **BGG collection import** — Bulk import from a BGG username
- **Push notifications** — Game night alerts (Web Push + service worker)
- **Email notifications** — Fallback via Resend (loans, nights, reminders)
- **Onboarding** — First-run wizard for new users
- **Realtime** — Live refresh when games, loans, RSVPs, or plays change
- **Duplicate detection** — Warns when adding a game that already exists

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, React 19)
- [Supabase](https://supabase.com/) (PostgreSQL, auth, RLS, Realtime)
- [BoardGameGeek XML API](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) + [Resend](https://resend.com) (email)
- [Tailwind CSS 4](https://tailwindcss.com/)
- Progressive Web App (`manifest.json` + service worker)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Csstform/BgLib.git
cd BgLib
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor**, paste the contents of [`supabase/install.sql`](supabase/install.sql), and run it
3. Enable **Realtime** (Database → Replication) for: `games`, `loans`, `game_night_rsvps`, `plays`, `want_to_play`
4. Under **Project Settings → API**, copy the **Project URL** and **anon public** key

See [`supabase/README.md`](supabase/README.md) for manual step-by-step migrations or regenerating `install.sql`.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

**Required:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

**Optional** (enable extra features):

| Variable | Feature |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Push, email, cron (server-side) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push |
| `VAPID_SUBJECT` | Push contact (`mailto:you@example.com`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email notifications |
| `BGG_API_TOKEN` | **Required** for BGG search/import ([register here](https://boardgamegeek.com/applications)) |
| `GAMEUPC_API_TOKEN` | Optional — barcode scan on Add Game ([GameUPC](https://gameupc.com)) |
| `NEXT_PUBLIC_APP_URL` | Email links and cron base URL |
| `CRON_SECRET` | Bearer token for `/api/cron/loan-reminders` |

Generate VAPID keys: `npx web-push generate-vapid-keys`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Install on mobile

- **iOS (Safari)**: Share → **Add to Home Screen** (not “Add to Dock” — that creates a widget)
- **Android (Chrome)**: Menu → **Install app** or the install banner

If it installed as a shortcut/widget before, delete the old icon and reinstall after deploying the latest version. The app needs PNG icons and a registered service worker to install as a full standalone app.

## Deploy (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Add environment variables from `.env.local.example`
3. Deploy — `vercel.json` configures a daily loan-reminder cron at 09:00 UTC

Set `CRON_SECRET` in Vercel and ensure `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `EMAIL_FROM` are set for reminders and email.

## Self-host (DigitalOcean + Cloudflare)

To run on your own server with a custom domain (e.g. `bglib.csst.rocks` through Cloudflare):

1. Follow **[`deploy/README.md`](deploy/README.md)** — droplet setup, nginx, systemd, origin SSL
2. Set `NEXT_PUBLIC_APP_URL` to your public HTTPS URL
3. Use the included systemd timer for loan reminders (replaces Vercel cron)

Quick path on a fresh Ubuntu droplet:

```bash
git clone https://github.com/Csstform/BgLib.git /opt/bglib
cd /opt/bglib
cp deploy/env.production.example .env.local   # edit with your keys
npm ci && npm run build
npm run start:prod   # smoke test, then set up systemd + nginx per deploy/README.md
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:build` | Regenerate `supabase/install.sql` |

## Database

| Table | Purpose |
|-------|---------|
| `profiles` | Display names, avatars, notification prefs |
| `groups` / `group_members` | Gaming groups and membership |
| `games` | Group-scoped catalogue |
| `ownership` | User ↔ game ownership |
| `game_nights` / `game_night_rsvps` / `game_night_games` | Events and planning |
| `loans` | Borrow/lend tracking |
| `plays` / `play_participants` | Session history |
| `want_to_play` | Interest markers |
| `push_subscriptions` | Web push endpoints |

Row Level Security scopes data by group membership.

## Routes

| Route | Purpose |
|-------|---------|
| `/library` | Browse group catalogue |
| `/library/[id]` | Game detail, want-to-play, edit/merge |
| `/picker` | What can we play? |
| `/game-nights` | Upcoming sessions |
| `/game-nights/[id]` | RSVP, suggest games |
| `/loans` | Borrow/lend in your group |
| `/more` | Hub: collection, players, plays, add game, profile |
| `/collection` | Games you own |
| `/users` / `/users/[id]` | Group members |
| `/plays` / `/plays/new` | Play history and logging |
| `/add-game` | Add to catalogue (BGG search) |
| `/profile` | Invite code, notifications, BGG import |
| `/onboarding` | First-run setup |
| `/login` / `/signup` | Auth |

## Project Structure

```
src/
├── app/                  # Pages and API routes
├── components/           # UI (NavBar, GameCard, RealtimeRefresh, …)
└── lib/
    ├── supabase/         # Browser, server, and admin clients
    ├── group.ts          # Active group and membership helpers
    ├── push.ts / email.ts
    └── types.ts
supabase/
├── install.sql           # Single-file install (generated)
├── schema.sql            # Base schema
├── migrations/           # Ordered migrations 002–005
└── README.md             # Database setup guide
scripts/
├── build-install-sql.sh  # Builds install.sql
└── start-production.sh   # Standalone server for self-hosting
deploy/
├── README.md             # DigitalOcean + Cloudflare guide
├── env.production.example
├── nginx-bglib.conf
├── bglib.service
└── bglib-cron.service / .timer
```

## License

MIT — see [LICENSE](LICENSE).
