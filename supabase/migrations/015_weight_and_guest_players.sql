-- BGG complexity (average weight) on catalogue games
alter table public.games
  add column if not exists bgg_weight numeric(3, 2);

-- Guest players on logged plays (name only, no account)
alter table public.play_participants
  alter column user_id drop not null;

alter table public.play_participants
  add column if not exists guest_name text;

alter table public.play_participants
  drop constraint if exists play_participants_play_id_user_id_key;

drop index if exists play_participants_play_user_uidx;
drop index if exists play_participants_play_guest_uidx;

create unique index if not exists play_participants_play_user_uidx
  on public.play_participants (play_id, user_id)
  where user_id is not null;

create unique index if not exists play_participants_play_guest_uidx
  on public.play_participants (play_id, lower(guest_name))
  where guest_name is not null;

alter table public.play_participants
  drop constraint if exists play_participants_player_check;

alter table public.play_participants
  add constraint play_participants_player_check
  check (
    (user_id is not null and guest_name is null)
    or (
      user_id is null
      and guest_name is not null
      and length(trim(guest_name)) > 0
    )
  );
