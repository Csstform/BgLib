-- Fix group creation: allow creators to read their group before membership exists,
-- and provide a security-definer RPC for atomic create + join as owner.

drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select using (
    public.is_group_member(id)
    or created_by = auth.uid()
  );

drop policy if exists "Authenticated users can create groups" on public.groups;
create policy "Authenticated users can create groups"
  on public.groups for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
  );

create or replace function public.create_group(group_name text, group_description text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  code text;
  uid uuid := auth.uid();
  clean_name text := trim(group_name);
  clean_desc text := nullif(trim(group_description), '');
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if clean_name is null or clean_name = '' then
    raise exception 'Group name is required';
  end if;

  code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));

  insert into public.groups (name, description, invite_code, created_by)
  values (clean_name, clean_desc, code, uid)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, uid, 'owner');

  update public.profiles
  set active_group_id = new_group_id
  where id = uid;

  return json_build_object(
    'id', new_group_id,
    'name', clean_name,
    'description', clean_desc,
    'invite_code', code,
    'created_by', uid,
    'created_at', now()
  );
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;
