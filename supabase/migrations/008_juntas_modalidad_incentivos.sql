-- Add junta modality and incentive configuration
alter table public.juntas
  add column if not exists tipo_junta text not null default 'normal',
  add column if not exists incentivo_porcentaje numeric(6,2) not null default 0,
  add column if not exists incentivo_regla text not null default 'primero_ultimo',
  add column if not exists cuota_base numeric(12,2),
  add column if not exists bolsa_base numeric(12,2);

update public.juntas
set
  cuota_base = coalesce(cuota_base, monto_cuota),
  bolsa_base = coalesce(bolsa_base, monto_cuota * participantes_max),
  tipo_junta = coalesce(tipo_junta, 'normal'),
  incentivo_porcentaje = coalesce(incentivo_porcentaje, 0),
  incentivo_regla = coalesce(incentivo_regla, 'primero_ultimo');

alter table public.juntas
  alter column cuota_base set not null,
  alter column bolsa_base set not null;

alter table public.juntas
  add constraint juntas_tipo_junta_check check (tipo_junta in ('normal', 'incentivo')),
  add constraint juntas_incentivo_regla_check check (incentivo_regla in ('primero_ultimo', 'escalonado')),
  add constraint juntas_incentivo_porcentaje_check check (incentivo_porcentaje >= 0);
