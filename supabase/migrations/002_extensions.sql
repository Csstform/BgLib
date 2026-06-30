-- BgLib Extensions Migration
-- Run this in Supabase SQL Editor after the base schema

-- Game nights
create table if not exists public.game_nights (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  host_id uuid references public.profiles(id) on delete cascade not null,
  scheduled_at timestamptz not null,
  location text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.game_night_games (
  id uuid default gen_random_uuid() primary key,
  game_night_id uuid references public.game_nights(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  unique (game_night_id, game_id)
);

create table if not exists public.game_night_rsvps (
  id uuid default gen_random_uuid() primary key,
  game_night_id uuid references public.game_nights(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('going', 'maybe', 'declined')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (game_night_id, user_id)
);

-- Lending / borrowing
create table if not exists public.loans (
  id uuid default gen_random_uuid() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  lender_id uuid references public.profiles(id) on delete cascade not null,
  borrower_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'returned', 'declined', 'cancelled')),
  due_date date,
  notes text,
  borrowed_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  check (lender_id != borrower_id)
);

-- Web push subscriptions
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now() not null,
  unique (user_id, endpoint)
);

create index if not exists game_nights_scheduled_idx on public.game_nights (scheduled_at);
create index if not exists loans_lender_idx on public.loans (lender_id);
create index if not exists loans_borrower_idx on public.loans (borrower_id);
create index if not exists loans_status_idx on public.loans (status);

-- Updated_at triggers
create trigger game_nights_updated_at before update on public.game_nights
  for each row execute function public.update_updated_at();

create trigger game_night_rsvps_updated_at before update on public.game_night_rsvps
  for each row execute function public.update_updated_at();

create trigger loans_updated_at before update on public.loans
  for each row execute function public.update_updated_at();

-- RLS
alter table public.game_nights enable row level security;
alter table public.game_night_games enable row level security;
alter table public.game_night_rsvps enable row level security;
alter table public.loans enable row level security;
alter table public.push_subscriptions enable row level security;

-- Game nights policies
create policy "Game nights are viewable by everyone"
  on public.game_nights for select using (true);

create policy "Authenticated users can create game nights"
  on public.game_nights for insert with check (auth.uid() = host_id);

create policy "Hosts can update their game nights"
  on public.game_nights for update using (auth.uid() = host_id);

create policy "Hosts can delete their game nights"
  on public.game_nights for delete using (auth.uid() = host_id);

-- Game night games policies
create policy "Game night games are viewable by everyone"
  on public.game_night_games for select using (true);

create policy "Hosts can manage game night games"
  on public.game_night_games for all using (
    exists (
      select 1 from public.game_nights gn
      where gn.id = game_night_id and gn.host_id = auth.uid()
    )
  );

-- RSVP policies
create policy "RSVPs are viewable by everyone"
  on public.game_night_rsvps for select using (true);

create policy "Users can manage their RSVPs"
  on public.game_night_rsvps for all using (auth.uid() = user_id);

-- Loan policies
create policy "Loans are viewable by involved parties"
  on public.loans for select using (
    auth.uid() = lender_id or auth.uid() = borrower_id
  );

create policy "Borrowers can request loans"
  on public.loans for insert with check (
    auth.uid() = borrower_id and status = 'pending'
  );

create policy "Involved parties can update loans"
  on public.loans for update using (
    auth.uid() = lender_id or auth.uid() = borrower_id
  );

-- Push subscription policies
create policy "Users can view own subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);

create policy "Users can manage own subscriptions"
  on public.push_subscriptions for all using (auth.uid() = user_id);
