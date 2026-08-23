-- BgLib: Board Game Library Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  real_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Board games catalogue
create table if not exists public.games (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  min_players integer default 1,
  max_players integer,
  play_time_minutes integer,
  image_url text,
  bgg_id integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ownership: who owns which games
create table if not exists public.ownership (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  condition text default 'good' check (condition in ('new', 'like_new', 'good', 'fair', 'poor')),
  notes text,
  acquired_date date,
  created_at timestamptz default now() not null,
  unique (user_id, game_id)
);

-- Indexes
create index if not exists games_title_idx on public.games using gin (to_tsvector('english', title));
create index if not exists ownership_user_idx on public.ownership (user_id);
create index if not exists ownership_game_idx on public.ownership (game_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at before update on public.games
  for each row execute function public.update_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.ownership enable row level security;

-- Profiles: anyone can read, users can update own
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Games: anyone can read, authenticated users can create
drop policy if exists "Games are viewable by everyone" on public.games;
create policy "Games are viewable by everyone"
  on public.games for select using (true);

drop policy if exists "Authenticated users can create games" on public.games;
create policy "Authenticated users can create games"
  on public.games for insert with check (auth.uid() is not null);

drop policy if exists "Creators can update their games" on public.games;
create policy "Creators can update their games"
  on public.games for update using (auth.uid() = created_by);

-- Ownership: anyone can read, users manage their own
drop policy if exists "Ownership is viewable by everyone" on public.ownership;
create policy "Ownership is viewable by everyone"
  on public.ownership for select using (true);

drop policy if exists "Users can add to their collection" on public.ownership;
create policy "Users can add to their collection"
  on public.ownership for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their ownership" on public.ownership;
create policy "Users can update their ownership"
  on public.ownership for update using (auth.uid() = user_id);

drop policy if exists "Users can remove from their collection" on public.ownership;
create policy "Users can remove from their collection"
  on public.ownership for delete using (auth.uid() = user_id);

-- View: games with owner count
drop view if exists public.games_with_owners;
create or replace view public.games_with_owners as
select
  g.*,
  coalesce(json_agg(
    json_build_object(
      'user_id', p.id,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'condition', o.condition,
      'notes', o.notes,
      'acquired_date', o.acquired_date
    )
  ) filter (where p.id is not null), '[]') as owners
from public.games g
left join public.ownership o on o.game_id = g.id
left join public.profiles p on p.id = o.user_id
group by g.id;
