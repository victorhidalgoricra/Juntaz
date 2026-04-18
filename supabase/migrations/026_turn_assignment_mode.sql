-- Add turn assignment mode and enforce assignment rules when activating a junta.

alter table public.juntas
  add column if not exists turn_assignment_mode text not null default 'random'
    check (turn_assignment_mode in ('random', 'manual'));

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
  v_min_turn int;
  v_max_turn int;
  v_distinct_turns int;
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

  if coalesce(v_junta.turn_assignment_mode, 'random') = 'manual' then
    select
      count(distinct orden_turno),
      min(orden_turno),
      max(orden_turno)
    into v_distinct_turns, v_min_turn, v_max_turn
    from public.junta_members
    where junta_id = p_junta_id and estado = 'activo';

    if v_distinct_turns <> v_count or v_min_turn <> 1 or v_max_turn <> v_count then
      raise exception 'Define un orden manual completo (sin huecos ni duplicados) antes de activar la junta.';
    end if;
  else
    update public.junta_members as jm
    set orden_turno = ranked.turno
    from (
      select id, row_number() over (order by random()) as turno
      from public.junta_members
      where junta_id = p_junta_id and estado = 'activo'
    ) ranked
    where ranked.id = jm.id;
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
