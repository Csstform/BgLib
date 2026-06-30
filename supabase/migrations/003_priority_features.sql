-- BgLib Priority Features Migration
-- Run after schema.sql and 002_extensions.sql

-- Groups
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  invite_code text unique not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  unique (group_id, user_id)
);

-- Profile extensions
alter table public.profiles
  add column if not exists onboarding_completed boolean default false not null,
  add column if not exists active_group_id uuid references public.groups(id) on delete set null;

-- Group scoping
alter table public.games
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

alter table public.game_nights
  add column if not exists group_id uuid references public.groups(id) on delete cascade,
  add column if not exists cancelled_at timestamptz;

-- Play logging
create table if not exists public.plays (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  played_at timestamptz default now() not null,
  duration_minutes integer,
  notes text,
  logged_by uuid references public.profiles(id) on delete set null not null,
  created_at timestamptz default now() not null
);

create table if not exists public.play_participants (
  id uuid default gen_random_uuid() primary key,
  play_id uuid references public.plays(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (play_id, user_id)
);

create index if not exists games_group_idx on public.games (group_id);
create index if not exists games_bgg_idx on public.games (bgg_id) where bgg_id is not null;
create index if not exists game_nights_group_idx on public.game_nights (group_id);
create index if not exists plays_group_idx on public.plays (group_id);
create index if not exists plays_game_idx on public.plays (game_id);
create index if not exists group_members_user_idx on public.group_members (user_id);

-- Updated signup: create default group
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_group_id uuid;
  display text;
  code text;
begin
  display := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  insert into public.profiles (id, display_name)
  values (new.id, display);

  insert into public.groups (name, invite_code, created_by)
  values (display || '''s Library', code, new.id)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, new.id, 'owner');

  update public.profiles
  set active_group_id = new_group_id
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

-- Backfill groups for existing users
do $$
declare
  p record;
  gid uuid;
  code text;
begin
  for p in select id, display_name from public.profiles loop
    if not exists (select 1 from public.group_members where user_id = p.id) then
      code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
      insert into public.groups (name, invite_code, created_by)
      values (p.display_name || '''s Library', code, p.id)
      returning id into gid;
      insert into public.group_members (group_id, user_id, role)
      values (gid, p.id, 'owner');
      update public.profiles
      set active_group_id = coalesce(active_group_id, gid)
      where id = p.id;
    end if;
  end loop;
end $$;

-- Assign orphan games to creator's active group
update public.games g
set group_id = p.active_group_id
from public.profiles p
where g.created_by = p.id
  and g.group_id is null
  and p.active_group_id is not null;

-- Assign orphan game nights
update public.game_nights gn
set group_id = p.active_group_id
from public.profiles p
where gn.host_id = p.id
  and gn.group_id is null
  and p.active_group_id is not null;

-- RLS
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.plays enable row level security;
alter table public.play_participants enable row level security;

-- Groups: members can view their groups
create policy "Members can view their groups"
  on public.groups for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = created_by);

create policy "Owners can update their groups"
  on public.groups for update using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'owner'
    )
  );

-- Group members
create policy "Members can view group membership"
  on public.group_members for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

create policy "Users can join groups"
  on public.group_members for insert with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete using (auth.uid() = user_id);

-- Plays
create policy "Group members can view plays"
  on public.plays for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = plays.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can log plays"
  on public.plays for insert with check (
    auth.uid() = logged_by and
    exists (
      select 1 from public.group_members gm
      where gm.group_id = plays.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Loggers can delete their plays"
  on public.plays for delete using (auth.uid() = logged_by);

-- Play participants
create policy "Group members can view play participants"
  on public.play_participants for select using (
    exists (
      select 1 from public.plays pl
      join public.group_members gm on gm.group_id = pl.group_id
      where pl.id = play_id and gm.user_id = auth.uid()
    )
  );

create policy "Play loggers can manage participants"
  on public.play_participants for all using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_id and pl.logged_by = auth.uid()
    )
  );

-- Update games policies for group scoping
drop policy if exists "Games are viewable by everyone" on public.games;
create policy "Group members can view games"
  on public.games for select using (
    group_id is null or exists (
      select 1 from public.group_members gm
      where gm.group_id = games.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create games" on public.games;
create policy "Group members can create games"
  on public.games for insert with check (
    auth.uid() is not null and
    exists (
      select 1 from public.group_members gm
      where gm.group_id = games.group_id and gm.user_id = auth.uid()
    )
  );

-- Join group by invite code (security definer)
create or replace function public.join_group_by_invite(invite text)
returns uuid as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = upper(invite);
  if gid is null then
    raise exception 'Invalid invite code';
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  update public.profiles set active_group_id = gid where id = auth.uid();
  return gid;
end;
$$ language plpgsql security definer;

-- Mark existing users as onboarded (new signups start fresh)
update public.profiles set onboarding_completed = true;

grant execute on function public.join_group_by_invite(text) to authenticated;
