-- Quick "mark as played" acknowledgements should not look like a dated session.
alter table public.plays
  add column if not exists undated boolean not null default false;

create index if not exists plays_group_dated_idx
  on public.plays (group_id, played_at desc)
  where undated = false;
