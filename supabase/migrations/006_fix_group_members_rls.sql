-- Fix infinite recursion in group_members RLS policies.
-- The SELECT policy queried group_members from within group_members policies.

create or replace function public.is_group_member(check_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(check_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = check_group_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;

drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select using (
    public.is_group_member(id)
  );

drop policy if exists "Owners can update their groups" on public.groups;
create policy "Owners can update their groups"
  on public.groups for update using (
    public.is_group_owner(id)
  );

drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
  );
