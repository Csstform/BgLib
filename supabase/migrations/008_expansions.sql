-- Game expansions: link to base games + log expansions used in plays

alter table public.games
  add column if not exists base_game_id uuid references public.games(id) on delete set null,
  add column if not exists bgg_type text check (bgg_type in ('boardgame', 'boardgameexpansion'));

create index if not exists games_base_game_idx on public.games (base_game_id);

create table if not exists public.play_expansions (
  play_id uuid references public.plays(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  primary key (play_id, game_id)
);

create index if not exists play_expansions_play_idx on public.play_expansions (play_id);
create index if not exists play_expansions_game_idx on public.play_expansions (game_id);

alter table public.play_expansions enable row level security;

create policy "Group members can view play expansions"
  on public.play_expansions for select using (
    exists (
      select 1 from public.plays pl
      join public.group_members gm on gm.group_id = pl.group_id
      where pl.id = play_expansions.play_id and gm.user_id = auth.uid()
    )
  );

create policy "Play loggers can manage play expansions"
  on public.play_expansions for all using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_expansions.play_id and pl.logged_by = auth.uid()
    )
  );
