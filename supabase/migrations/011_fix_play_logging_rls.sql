-- Fix play logging: explicit INSERT policies for participants and expansions.
-- FOR ALL + USING-only policies can block INSERT in some PostgREST paths.

drop policy if exists "Play loggers can manage participants" on public.play_participants;
drop policy if exists "Play loggers can manage play expansions" on public.play_expansions;
drop policy if exists "Play loggers can insert participants" on public.play_participants;
drop policy if exists "Play loggers can update participants" on public.play_participants;
drop policy if exists "Play loggers can delete participants" on public.play_participants;
drop policy if exists "Play loggers can insert play expansions" on public.play_expansions;
drop policy if exists "Play loggers can update play expansions" on public.play_expansions;
drop policy if exists "Play loggers can delete play expansions" on public.play_expansions;

create policy "Play loggers can insert participants"
  on public.play_participants for insert with check (
    exists (
      select 1 from public.plays pl
      join public.group_members gm on gm.group_id = pl.group_id
      where pl.id = play_id
        and pl.logged_by = auth.uid()
        and gm.user_id = auth.uid()
    )
  );

create policy "Play loggers can update participants"
  on public.play_participants for update using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_id and pl.logged_by = auth.uid()
    )
  );

create policy "Play loggers can delete participants"
  on public.play_participants for delete using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_id and pl.logged_by = auth.uid()
    )
  );

create policy "Play loggers can insert play expansions"
  on public.play_expansions for insert with check (
    exists (
      select 1 from public.plays pl
      join public.group_members gm on gm.group_id = pl.group_id
      where pl.id = play_id
        and pl.logged_by = auth.uid()
        and gm.user_id = auth.uid()
    )
  );

create policy "Play loggers can update play expansions"
  on public.play_expansions for update using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_id and pl.logged_by = auth.uid()
    )
  );

create policy "Play loggers can delete play expansions"
  on public.play_expansions for delete using (
    exists (
      select 1 from public.plays pl
      where pl.id = play_id and pl.logged_by = auth.uid()
    )
  );
