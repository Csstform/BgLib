-- Barcode / UPC support for quick game adds

alter table public.games
  add column if not exists upc text;

create index if not exists games_upc_idx on public.games (upc) where upc is not null;

create table if not exists public.upc_bgg_mappings (
  upc text primary key,
  bgg_id integer not null,
  title text,
  source text default 'gameupc' not null,
  updated_at timestamptz default now() not null
);

alter table public.upc_bgg_mappings enable row level security;

create policy "Authenticated users can read UPC mappings"
  on public.upc_bgg_mappings for select
  to authenticated
  using (true);

create policy "Authenticated users can insert UPC mappings"
  on public.upc_bgg_mappings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update UPC mappings"
  on public.upc_bgg_mappings for update
  to authenticated
  using (true);
