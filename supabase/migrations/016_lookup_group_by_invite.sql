-- Public invite-link lookup. RLS on groups only allows members to read rows,
-- so /join/CODE must resolve a name without already belonging to the group.
create or replace function public.lookup_group_by_invite(invite text)
returns table (id uuid, name text, invite_code text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.invite_code
  from public.groups g
  where g.invite_code = upper(trim(invite));
$$;

grant execute on function public.lookup_group_by_invite(text) to anon, authenticated;
