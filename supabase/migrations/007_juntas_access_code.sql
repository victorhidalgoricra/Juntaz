-- Add private access code support for juntas and lookup RPC
alter table public.juntas
  add column if not exists access_code text;

create unique index if not exists juntas_access_code_unique_idx
  on public.juntas (access_code)
  where access_code is not null;

create index if not exists juntas_visibilidad_estado_idx
  on public.juntas (visibilidad, estado, created_at desc);

create or replace function public.get_junta_by_access_code(p_access_code text)
returns setof public.juntas
language sql
security definer
set search_path = public
as $$
  select *
  from public.juntas
  where upper(access_code) = upper(trim(p_access_code))
    and visibilidad = 'privada'
    and estado in ('borrador', 'activa')
  limit 1;
$$;

revoke all on function public.get_junta_by_access_code(text) from public;
grant execute on function public.get_junta_by_access_code(text) to authenticated;
