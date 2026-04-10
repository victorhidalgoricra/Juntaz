create or replace function public.activate_junta_if_ready(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
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

  if v_junta.admin_id <> v_uid then
    raise exception 'Solo el creador puede activar la junta.';
  end if;

  if v_junta.estado = 'activa' then
    return v_junta;
  end if;

  select count(*) into v_count
  from public.junta_members
  where junta_id = p_junta_id and estado = 'activo';

  if v_count < v_junta.participantes_max then
    raise exception 'Completa todos los integrantes para activar la junta';
  end if;

  update public.juntas
  set estado = 'activa'
  where id = p_junta_id
  returning * into v_junta;

  return v_junta;
end;
$$;

revoke all on function public.activate_junta_if_ready(uuid) from public;
grant execute on function public.activate_junta_if_ready(uuid) to authenticated;
