-- Remove recursive policies on public.junta_members and replace with non-recursive rules.
drop policy if exists "members visible in own junta" on public.junta_members;
drop policy if exists "members manage by admin" on public.junta_members;
drop policy if exists "junta members by owner" on public.junta_members;
drop policy if exists "junta members read visible" on public.junta_members;
drop policy if exists "junta members self join" on public.junta_members;

-- Owner can read/manage members based on public.juntas.admin_id (no subquery to junta_members).
create policy "junta_members_select_owner_or_self" on public.junta_members
for select
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
);

create policy "junta_members_insert_owner" on public.junta_members
for insert
with check (
  exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
);

create policy "junta_members_insert_self_join" on public.junta_members
for insert
with check (
  profile_id = auth.uid()
  and rol = 'participante'
  and estado = 'activo'
  and exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and (j.visibilidad = 'publica' or j.admin_id = auth.uid())
  )
);

create policy "junta_members_update_owner" on public.junta_members
for update
using (
  exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
);

create policy "junta_members_delete_owner_or_self_leave" on public.junta_members
for delete
using (
  exists (
    select 1
    from public.juntas j
    where j.id = junta_members.junta_id
      and j.admin_id = auth.uid()
  )
  or (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.juntas j
      where j.id = junta_members.junta_id
        and j.admin_id <> auth.uid()
        and j.estado <> 'activa'
    )
  )
);
