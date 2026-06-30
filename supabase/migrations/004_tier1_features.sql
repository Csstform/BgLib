-- BgLib Tier 1 Features Migration

-- Want to play
create table if not exists public.want_to_play (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  group_id uuid references public.groups(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, game_id, group_id)
);

create index if not exists want_to_play_group_idx on public.want_to_play (group_id);
create index if not exists want_to_play_game_idx on public.want_to_play (game_id);

-- Notification preferences on profiles
alter table public.profiles
  add column if not exists email_notifications boolean default true not null;

-- Loan reminder tracking
alter table public.loans
  add column if not exists reminder_sent_at timestamptz;

-- RLS for want_to_play
alter table public.want_to_play enable row level security;

create policy "Group members can view want to play"
  on public.want_to_play for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = want_to_play.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Users can manage their want to play"
  on public.want_to_play for all using (auth.uid() = user_id);

-- Allow group members to update games in their group
drop policy if exists "Creators can update their games" on public.games;
create policy "Group members can update group games"
  on public.games for update using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = games.group_id and gm.user_id = auth.uid()
    )
  );

-- Allow group members to delete games in their group (for merge cleanup)
create policy "Group members can delete group games"
  on public.games for delete using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = games.group_id and gm.user_id = auth.uid()
    )
  );
