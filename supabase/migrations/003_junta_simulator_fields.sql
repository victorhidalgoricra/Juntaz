-- Financial simulator fields for junta builder
alter table public.juntas
  add column if not exists premio_primero_pct numeric(5,2) not null default 0,
  add column if not exists descuento_ultimo_pct numeric(5,2) not null default 0,
  add column if not exists fee_plataforma_pct numeric(5,2) not null default 0;

do $$ begin
  alter table public.juntas add constraint juntas_premio_primero_pct_range check (premio_primero_pct >= 0 and premio_primero_pct <= 100);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.juntas add constraint juntas_descuento_ultimo_pct_range check (descuento_ultimo_pct >= 0 and descuento_ultimo_pct <= 100);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.juntas add constraint juntas_fee_plataforma_pct_range check (fee_plataforma_pct >= 0 and fee_plataforma_pct <= 100);
exception when duplicate_object then null;
end $$;
