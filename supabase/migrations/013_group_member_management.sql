-- Allow group owners to remove non-owner members.

drop policy if exists "Owners can remove members" on public.group_members;
create policy "Owners can remove members"
  on public.group_members for delete
  using (
    public.is_group_owner(group_id)
    and user_id <> auth.uid()
    and role <> 'owner'
  );
