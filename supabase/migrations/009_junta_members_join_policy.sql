-- Allow authenticated users to view members of visible juntas and join with capacity checks
do $$ begin
  create policy "junta members read visible" on public.junta_members
  for select using (
    exists (
      select 1
      from public.juntas j
      where j.id = junta_members.junta_id
        and (
          j.visibilidad = 'publica'
          or j.admin_id = auth.uid()
          or exists (
            select 1 from public.junta_members own
            where own.junta_id = junta_members.junta_id
              and own.profile_id = auth.uid()
          )
        )
    )
  );
exception when duplicate_object then null;
end $$;

create or replace function public.join_junta_with_access_code(p_junta_id uuid, p_access_code text)
returns public.junta_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_member public.junta_members%rowtype;
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.visibilidad = 'privada' and upper(coalesce(v_junta.access_code, '')) <> upper(trim(coalesce(p_access_code, ''))) then
    raise exception 'Código privado inválido';
  end if;

  select count(*) into v_count
  from public.junta_members
  where junta_id = p_junta_id and estado = 'activo';

  if v_count >= v_junta.participantes_max then
    raise exception 'Cupo completo';
  end if;

  if exists(select 1 from public.junta_members where junta_id = p_junta_id and profile_id = v_uid) then
    raise exception 'Ya formas parte de esta junta';
  end if;

  insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
  values (p_junta_id, v_uid, 'activo', 'participante', v_count + 1)
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_junta_with_access_code(uuid, text) from public;
grant execute on function public.join_junta_with_access_code(uuid, text) to authenticated;

do $$ begin
  create policy "junta members self join" on public.junta_members
  for insert with check (
    profile_id = auth.uid()
    and estado = 'activo'
    and rol = 'participante'
    and exists (
      select 1
      from public.juntas j
      where j.id = junta_members.junta_id
        and (j.visibilidad = 'publica' or j.admin_id = auth.uid())
        and (
          select count(*)
          from public.junta_members jm
          where jm.junta_id = junta_members.junta_id
            and jm.estado = 'activo'
        ) < j.participantes_max
    )
    and not exists (
      select 1
      from public.junta_members exists_member
      where exists_member.junta_id = junta_members.junta_id
        and exists_member.profile_id = auth.uid()
    )
  );
exception when duplicate_object then null;
end $$;
