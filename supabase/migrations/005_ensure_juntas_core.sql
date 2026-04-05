-- Ensure core tables exist for junta creation flow
create extension if not exists pgcrypto;

do $$ begin
  create type public.junta_visibility as enum ('privada', 'invitacion', 'publica');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.frecuencia_pago as enum ('semanal', 'quincenal', 'mensual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.junta_estado as enum ('borrador', 'activa', 'cerrada', 'bloqueada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_estado as enum ('invitado', 'activo', 'pendiente', 'moroso', 'retirado');
exception when duplicate_object then null;
end $$;

create table if not exists public.juntas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  slug text unique,
  invite_token text unique,
  nombre text not null,
  descripcion text,
  moneda text not null default 'PEN' check (moneda in ('PEN', 'USD')),
  participantes_max int not null check (participantes_max >= 2),
  monto_cuota numeric(12,2) not null check (monto_cuota > 0),
  frecuencia_pago public.frecuencia_pago not null,
  fecha_inicio date not null,
  dia_limite_pago int not null default 1,
  premio_primero_pct numeric(5,2) not null default 0,
  descuento_ultimo_pct numeric(5,2) not null default 0,
  fee_plataforma_pct numeric(5,2) not null default 0,
  penalidad_mora numeric(12,2),
  visibilidad public.junta_visibility not null default 'privada',
  cerrar_inscripciones boolean not null default false,
  estado public.junta_estado not null default 'borrador',
  bloqueada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.junta_members (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  estado public.member_estado not null default 'invitado',
  rol text not null check (rol in ('admin', 'participante')),
  orden_turno int not null default 1,
  saldo_pendiente numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(junta_id, profile_id)
);

alter table public.juntas enable row level security;
alter table public.junta_members enable row level security;

do $$ begin
  create policy "juntas owner crud" on public.juntas
  for all using (admin_id = auth.uid()) with check (admin_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "juntas public read" on public.juntas
  for select using (visibilidad = 'publica' or admin_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "junta members by owner" on public.junta_members
  for all using (
    exists (select 1 from public.juntas j where j.id = junta_id and j.admin_id = auth.uid())
  ) with check (
    exists (select 1 from public.juntas j where j.id = junta_id and j.admin_id = auth.uid())
  );
exception when duplicate_object then null;
end $$;
