-- Play winners, scores, and first-time flag

alter table public.play_participants
  add column if not exists is_winner boolean default false not null,
  add column if not exists score integer;

alter table public.plays
  add column if not exists first_time_played boolean default false not null;

create index if not exists play_participants_winner_idx
  on public.play_participants (play_id)
  where is_winner = true;
