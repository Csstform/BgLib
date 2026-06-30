# BgLib — Board Game Library

A mobile-friendly web app for iOS and Android that serves as a shared board game catalogue, logbook, and library. Multiple users can sign up, add games to a communal catalogue, and mark which games they own — making it easy to see who has what when planning game nights.

## Features

- **Shared game catalogue** — Add board games with title, description, player count, play time, and cover image
- **Ownership tracking** — Each user marks games in their personal collection; everyone can see who owns what
- **Player directory** — Browse all users and view their collections
- **Search** — Find games by title or owner name
- **Mobile-first PWA** — Installable on iOS and Android home screens; works like a native app
- **Multi-user auth** — Email/password sign-up and sign-in via Supabase

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, React 19)
- [Supabase](https://supabase.com/) (PostgreSQL database, authentication, Row Level Security)
- [Tailwind CSS 4](https://tailwindcss.com/)
- Progressive Web App (manifest + mobile viewport)

## Quick Start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Under **Project Settings → API**, copy your **Project URL** and **anon public** key

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Install on mobile

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

Row Level Security ensures users can only modify their own profile and ownership records, while all data is readable by authenticated and anonymous users for easy sharing.

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
└── schema.sql            # Database migration
```

## License

MIT
