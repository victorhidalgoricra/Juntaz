-- Add membership flag to catalog and allow member leave for non-active juntas
create or replace function public.catalog_juntas(p_include_private boolean default false)
returns table (
  id uuid,
  nombre text,
  descripcion text,
  visibilidad public.junta_visibility,
  tipo_junta text,
  cuota_base numeric,
  frecuencia_pago public.frecuencia_pago,
  fecha_inicio date,
  estado public.junta_estado,
  participantes_max int,
  access_code text,
  integrantes_actuales bigint,
  slug text,
  created_at timestamptz,
  is_member_current_user boolean
)
language sql
security definer
set search_path = public
as $$
  with members as (
    select junta_id, count(*)::bigint as integrantes_actuales
    from public.junta_members
    where estado = 'activo'
    group by junta_id
  )
  select
    j.id,
    j.nombre,
    j.descripcion,
    j.visibilidad,
    coalesce(j.tipo_junta, 'normal') as tipo_junta,
    coalesce(j.cuota_base, j.monto_cuota) as cuota_base,
    j.frecuencia_pago,
    j.fecha_inicio,
    j.estado,
    j.participantes_max,
    j.access_code,
    coalesce(m.integrantes_actuales, 0) as integrantes_actuales,
    j.slug,
    j.created_at,
    exists (
      select 1
      from public.junta_members jm
      where jm.junta_id = j.id
        and jm.profile_id = auth.uid()
        and jm.estado = 'activo'
    ) as is_member_current_user
  from public.juntas j
  left join members m on m.junta_id = j.id
  where j.estado in ('borrador', 'activa')
    and (j.visibilidad = 'publica' or (p_include_private = true and auth.uid() is not null))
  order by j.created_at desc
  limit 200;
$$;

create or replace function public.leave_junta(p_junta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.estado = 'activa' then
    raise exception 'No puedes retirarte de una junta activa.';
  end if;

  if v_junta.admin_id = v_uid then
    raise exception 'El creador no puede retirarse de su propia junta.';
  end if;

  delete from public.junta_members
  where junta_id = p_junta_id
    and profile_id = v_uid;
end;
$$;

revoke all on function public.leave_junta(uuid) from public;
grant execute on function public.leave_junta(uuid) to authenticated;
