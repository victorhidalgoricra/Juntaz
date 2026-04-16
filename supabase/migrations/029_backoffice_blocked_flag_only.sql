-- Fix backoffice soft delete to use only `bloqueada` flag (never write/read estado='bloqueada').

create or replace function public.admin_list_juntas(p_include_blocked boolean default false)
returns table (
  id uuid,
  nombre text,
  slug text,
  estado public.junta_estado,
  admin_id uuid,
  admin_nombre text,
  admin_email text,
  tipo_junta text,
  visibilidad text,
  participantes_max int,
  integrantes_actuales bigint,
  frecuencia_pago text,
  fecha_inicio date,
  created_at timestamptz,
  bloqueada boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not public.admin_is_backoffice(v_uid) then
    raise exception 'No autorizado';
  end if;

  return query
  select
    j.id,
    j.nombre,
    j.slug,
    j.estado,
    j.admin_id,
    p.nombre as admin_nombre,
    p.email as admin_email,
    coalesce(j.tipo_junta, 'normal') as tipo_junta,
    j.visibilidad,
    j.participantes_max,
    (
      select count(*)
      from public.junta_members jm
      where jm.junta_id = j.id
        and jm.estado = 'activo'
    ) as integrantes_actuales,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.created_at,
    coalesce(j.bloqueada, false) as bloqueada
  from public.juntas j
  left join public.profiles p on p.id = j.admin_id
  where p_include_blocked or coalesce(j.bloqueada, false) = false
  order by j.created_at desc;
end;
$$;

revoke all on function public.admin_list_juntas(boolean) from public;
grant execute on function public.admin_list_juntas(boolean) to authenticated;

create or replace function public.admin_soft_delete_junta(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_junta public.juntas%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if not public.admin_is_backoffice(v_uid) then
    raise exception 'No autorizado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if coalesce(v_junta.bloqueada, false) then
    return v_junta;
  end if;

  update public.juntas
  set
    bloqueada = true,
    cerrar_inscripciones = true
  where id = p_junta_id
  returning * into v_junta;

  return v_junta;
end;
$$;

revoke all on function public.admin_soft_delete_junta(uuid) from public;
grant execute on function public.admin_soft_delete_junta(uuid) to authenticated;
