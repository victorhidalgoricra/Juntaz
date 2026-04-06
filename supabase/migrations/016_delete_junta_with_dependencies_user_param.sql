create or replace function public.delete_junta_with_dependencies(p_junta_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_junta public.juntas%rowtype;
begin
  if p_user_id is null then
    raise exception 'No autenticado';
  end if;

  select * into v_junta
  from public.juntas
  where id = p_junta_id;

  if not found then
    raise exception 'Junta no encontrada';
  end if;

  if v_junta.admin_id <> p_user_id then
    raise exception 'Solo el creador puede eliminar esta junta.';
  end if;

  if v_junta.estado = 'activa' then
    raise exception 'No puedes eliminar una junta activa.';
  end if;

  delete from public.audit_logs where junta_id = p_junta_id;
  delete from public.notifications where junta_id = p_junta_id;
  delete from public.invitations where junta_id = p_junta_id;
  delete from public.payouts where junta_id = p_junta_id;
  delete from public.payments where junta_id = p_junta_id;
  delete from public.payment_schedules where junta_id = p_junta_id;
  delete from public.junta_members where junta_id = p_junta_id;

  delete from public.juntas where id = p_junta_id;
end;
$$;

revoke all on function public.delete_junta_with_dependencies(uuid, uuid) from public;
grant execute on function public.delete_junta_with_dependencies(uuid, uuid) to authenticated;
