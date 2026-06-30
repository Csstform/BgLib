-- RLS hardening: scope game nights and ownership by group membership

drop policy if exists "Game nights are viewable by everyone" on public.game_nights;
create policy "Group members can view game nights"
  on public.game_nights for select using (
    group_id is null or exists (
      select 1 from public.group_members gm
      where gm.group_id = game_nights.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "Ownership is viewable by everyone" on public.ownership;
create policy "Group members can view ownership"
  on public.ownership for select using (
    exists (
      select 1 from public.games g
      join public.group_members gm on gm.group_id = g.group_id
      where g.id = ownership.game_id and gm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.games g
      where g.id = ownership.game_id and g.group_id is null
    )
  );
