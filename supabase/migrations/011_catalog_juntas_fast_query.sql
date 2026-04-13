-- Fast catalog query + indexes to avoid timeouts on list views
create index if not exists juntas_catalog_visibility_estado_created_idx
  on public.juntas (visibilidad, estado, created_at desc);

create index if not exists junta_members_junta_estado_idx
  on public.junta_members (junta_id, estado);

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
  created_at timestamptz
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
    j.created_at
  from public.juntas j
  left join members m on m.junta_id = j.id
  where j.estado in ('borrador', 'activa')
    and (
      j.visibilidad = 'publica'
      or (p_include_private = true and auth.uid() is not null)
    )
  order by j.created_at desc
  limit 200;
$$;

revoke all on function public.catalog_juntas(boolean) from public;
grant execute on function public.catalog_juntas(boolean) to anon, authenticated;
