-- Ensure every junta creator is also an active member (backfill + insert-time guard).

insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
select
  j.id,
  j.admin_id,
  'activo'::public.miembro_estado,
  'admin',
  1
from public.juntas j
where not exists (
  select 1
  from public.junta_members jm
  where jm.junta_id = j.id
    and jm.profile_id = j.admin_id
);

create or replace function public.ensure_creator_membership_on_junta_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.junta_members (junta_id, profile_id, estado, rol, orden_turno)
  values (new.id, new.admin_id, 'activo', 'admin', 1)
  on conflict (junta_id, profile_id)
  do update
    set estado = 'activo',
        rol = 'admin',
        orden_turno = coalesce(public.junta_members.orden_turno, excluded.orden_turno);

  return new;
end;
$$;

drop trigger if exists trg_creator_membership_on_junta_insert on public.juntas;
create trigger trg_creator_membership_on_junta_insert
after insert on public.juntas
for each row execute function public.ensure_creator_membership_on_junta_insert();
