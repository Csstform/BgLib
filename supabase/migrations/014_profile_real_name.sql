-- Optional real name on profiles. The app falls back to display_name (username).

alter table public.profiles
  add column if not exists real_name text;
