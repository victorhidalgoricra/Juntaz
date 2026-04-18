-- Business timezone for activation deadline checks: America/Lima.

create or replace function public.current_app_date()
returns date
language sql
stable
as $$
  select (timezone('America/Lima', now()))::date;
$$;

create or replace function public.enforce_junta_activation_deadline(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
begin
  select * into v_junta from public.juntas where id = p_junta_id for update;
  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.estado = 'borrador'
     and coalesce(v_junta.bloqueada, false) = false
     and public.current_app_date() > v_junta.fecha_inicio then
    update public.juntas
      set bloqueada = true,
          cerrar_inscripciones = true
      where id = p_junta_id
      returning * into v_junta;
  end if;

  return v_junta;
end;
$$;

revoke all on function public.current_app_date() from public;
grant execute on function public.current_app_date() to anon, authenticated;
revoke all on function public.enforce_junta_activation_deadline(uuid) from public;
grant execute on function public.enforce_junta_activation_deadline(uuid) to authenticated;

create or replace function public.activate_junta_if_ready(p_junta_id uuid)
returns public.juntas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_junta public.juntas%rowtype;
  v_active_members int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_junta := public.enforce_junta_activation_deadline(p_junta_id);

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta fue bloqueada por no activarse a tiempo.';
  end if;

  if v_junta.admin_id <> v_uid then
    raise exception 'No autorizado';
  end if;

  if v_junta.estado <> 'borrador' then
    return v_junta;
  end if;

  select count(*) into v_active_members
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo';

  if v_active_members < v_junta.participantes_max then
    raise exception 'Completa todos los integrantes para activar la junta';
  end if;

  update public.juntas
  set estado = 'activa'
  where id = p_junta_id
  returning * into v_junta;

  return v_junta;
end;
$$;

create or replace function public.join_junta_secure(
  p_junta_id uuid,
  p_access_code text default null,
  p_invite_token text default null
)
returns public.junta_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_junta public.juntas%rowtype;
  v_member public.junta_members%rowtype;
  v_members_count int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_junta := public.enforce_junta_activation_deadline(p_junta_id);

  if coalesce(v_junta.bloqueada, false) then
    raise exception 'La junta está bloqueada por no activarse a tiempo.';
  end if;

  if v_junta.cerrar_inscripciones then
    raise exception 'Inscripciones cerradas';
  end if;

  if v_junta.visibilidad = 'privada' then
    if p_invite_token is not null and p_invite_token = v_junta.invite_token then
      null;
    elsif p_access_code is not null and upper(trim(p_access_code)) = upper(trim(v_junta.access_code)) then
      null;
    else
      raise exception 'Acceso privado inválido';
    end if;
  end if;

  if exists(select 1 from public.junta_members where junta_id = p_junta_id and profile_id = v_uid) then
    raise exception 'Ya formas parte de esta junta';
  end if;

  select count(*) into v_members_count
  from public.junta_members
  where junta_id = p_junta_id
    and estado = 'activo';

  if v_members_count >= v_junta.participantes_max then
    raise exception 'La junta ya está completa';
  end if;

  insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
  values (p_junta_id, v_uid, 'activo', 'participante', v_members_count + 1)
  returning * into v_member;

  return v_member;
end;
$$;
