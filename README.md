# BgLib — Board Game Library

A mobile-friendly web app for iOS and Android that serves as a shared board game catalogue, logbook, and library. Multiple users can sign up, add games to a communal catalogue, and mark which games they own — making it easy to see who has what when planning game nights.

## Features

- **Shared game catalogue** — Add board games with title, description, player count, play time, and cover image
- **Ownership tracking** — Each user marks games in their personal collection; everyone can see who owns what
- **Player directory** — Browse all users and view their collections
- **Search** — Find games by title or owner name
- **Mobile-first PWA** — Installable on iOS and Android home screens; works like a native app
- **Multi-user auth** — Email/password sign-up and sign-in via Supabase
- **BoardGameGeek import** — Search BGG when adding games to auto-fill title, description, players, play time, and cover image
- **Game night planning** — Schedule sessions, pick games, RSVP (going/maybe/declined)
- **Push notifications** — Get notified on your phone when someone plans a game night
- **Loan tracking** — Request, approve, and return borrowed games between owners
- **Gaming groups** — Separate libraries per friend group with invite codes
- **Game picker** — "What can we play?" filters by players, time, and who's attending
- **Play logging** — Record session history; picker prioritizes least-recently played games
- **Duplicate detection** — Warns when adding a game that already exists in your group
- **Onboarding** — Guided setup for new users (group, first game, notifications)
- **Realtime updates** — Live refresh when loans, RSVPs, or games change
- **Game picker on game nights** — Suggest games based on who's Going
- **Want to play** — Mark interest in games; visible on game detail pages
- **Edit & merge games** — Fix catalogue entries and combine duplicates
- **BGG collection import** — Bulk import owned games from a BGG username
- **Email notifications** — Fallback for loans, game nights, and reminders (via Resend)
- **Loan due-date reminders** — Daily cron for overdue/upcoming returns

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, React 19)
- [Supabase](https://supabase.com/) (PostgreSQL database, authentication, Row Level Security)
- [BoardGameGeek XML API](https://boardgamegeek.com/wiki/page/BGG_XML_API2) (game search and details)
- [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) (game night notifications)
- [Tailwind CSS 4](https://tailwindcss.com/)
- Progressive Web App (manifest + service worker)

## Quick Start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the **SQL Editor** and run migrations in order:
   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/migrations/002_extensions.sql`](supabase/migrations/002_extensions.sql)
   - [`supabase/migrations/003_priority_features.sql`](supabase/migrations/003_priority_features.sql)
   - [`supabase/migrations/004_tier1_features.sql`](supabase/migrations/004_tier1_features.sql)
3. Enable **Realtime** in Supabase Dashboard → Database → Replication for tables: `games`, `loans`, `game_night_rsvps`, `plays`, `want_to_play`
4. Under **Project Settings → API**, copy your **Project URL**, **anon public** key, and (optionally) **service role** key

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # for push notifications

# Generate VAPID keys: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
# Email via Resend (https://resend.com)
RESEND_API_KEY=re_...
EMAIL_FROM=BgLib <notifications@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=your-random-secret
```

### 3. Enable push notifications (optional)

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add them to `.env.local` (see above)
3. In the app, go to **Profile → Game night notifications → On**

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Install on mobile

- **iOS**: Open in Safari → Share → "Add to Home Screen"
- **Android**: Open in Chrome → menu → "Install app" or "Add to Home Screen"

## Deploy

Deploy to [Vercel](https://vercel.com) (recommended for Next.js):

1. Push to GitHub
2. Import the repo in Vercel
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables
4. Deploy

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User display names, avatars, bios (auto-created on sign-up) |
| `games` | Shared board game catalogue entries |
| `ownership` | Links users to games they own (with condition, notes) |
| `game_nights` | Scheduled game night events |
| `game_night_rsvps` | RSVP status per user per game night |
| `game_night_games` | Games planned for a game night |
| `loans` | Borrow/lend tracking between owners |
| `push_subscriptions` | Web push notification endpoints |
| `groups` | Gaming groups with invite codes |
| `group_members` | Group membership and roles |
| `plays` | Logged play sessions |
| `play_participants` | Who played in each session |
| `want_to_play` | Games users want to try in a group |

Row Level Security scopes data by group membership. Users manage their own profile, ownership, and loans they're involved in.

## Key routes

| Route | Purpose |
|-------|---------|
| `/picker` | What can we play? — filter by players, time, attendees |
| `/plays` | Play history for your group |
| `/onboarding` | First-run setup wizard |
| `/game-nights` | Plan and RSVP to sessions |
| `/loans` | Borrow/lend tracking |
| `/profile` | Invite code, notifications, settings |

## Project Structure

```
src/
├── app/                  # Pages (library, collection, users, auth)
├── components/           # UI components (GameCard, NavBar, etc.)
└── lib/
    ├── supabase/         # Supabase client helpers
    ├── types.ts          # TypeScript types
    └── utils.ts          # Formatting helpers
supabase/
├── schema.sql            # Base database migration
└── migrations/
    └── 004_tier1_features.sql  # Want-to-play, email prefs, edit/merge RLS
```

## License

MIT
