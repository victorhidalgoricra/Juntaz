-- Harden private access: do not leak access_code in catalog and allow private join
-- only with valid access_code OR valid invite_token.

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
    case when j.admin_id = auth.uid() then j.access_code else null end as access_code,
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

create or replace function public.join_junta_secure(
  p_junta_id uuid,
  p_access_code text default null,
  p_invite_token uuid default null
)
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
  v_code_ok boolean := false;
  v_token_ok boolean := false;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta from public.juntas where id = p_junta_id;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.visibilidad = 'privada' then
    v_code_ok := upper(coalesce(v_junta.access_code, '')) = upper(trim(coalesce(p_access_code, '')));
    v_token_ok := p_invite_token is not null and v_junta.invite_token = p_invite_token;
    if not (v_code_ok or v_token_ok) then
      raise exception 'Esta junta privada requiere enlace o código válido.';
    end if;
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

revoke all on function public.join_junta_secure(uuid, text, uuid) from public;
grant execute on function public.join_junta_secure(uuid, text, uuid) to authenticated;
