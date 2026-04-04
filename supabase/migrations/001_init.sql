-- Juntas Digitales MVP schema for Supabase/PostgreSQL
create extension if not exists pgcrypto;

create type public.junta_visibility as enum ('privada', 'invitacion');
create type public.frecuencia_pago as enum ('semanal', 'quincenal', 'mensual');
create type public.junta_estado as enum ('borrador', 'activa', 'cerrada');
create type public.member_estado as enum ('invitado', 'activo', 'pendiente', 'moroso', 'retirado');
create type public.schedule_estado as enum ('pendiente', 'pagada', 'vencida');
create type public.payment_estado as enum ('pendiente_aprobacion', 'aprobado', 'rechazado');
create type public.invitation_estado as enum ('pendiente', 'aceptada', 'rechazada', 'expirada');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  celular text not null,
  email text not null unique,
  dni text,
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.juntas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  nombre text not null,
  descripcion text,
  moneda text not null check (moneda in ('PEN', 'USD')),
  participantes_max int not null check (participantes_max >= 2),
  monto_cuota numeric(12,2) not null check (monto_cuota > 0),
  frecuencia_pago public.frecuencia_pago not null,
  fecha_inicio date not null,
  dia_limite_pago int not null check (dia_limite_pago between 1 and 31),
  penalidad_mora numeric(12,2),
  visibilidad public.junta_visibility not null default 'privada',
  cerrar_inscripciones boolean not null default false,
  estado public.junta_estado not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.junta_members (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  estado public.member_estado not null default 'invitado',
  rol text not null check (rol in ('admin', 'participante')),
  orden_turno int not null check (orden_turno > 0),
  saldo_pendiente numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(junta_id, profile_id),
  unique(junta_id, orden_turno)
);

create table public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  cuota_numero int not null check (cuota_numero > 0),
  fecha_vencimiento date not null,
  monto numeric(12,2) not null check (monto > 0),
  estado public.schedule_estado not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique(junta_id, cuota_numero)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  schedule_id uuid not null references public.payment_schedules(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  monto numeric(12,2) not null check (monto > 0),
  estado public.payment_estado not null default 'pendiente_aprobacion',
  comprobante_url text,
  pagado_en timestamptz not null default now(),
  revisado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  ronda_numero int not null check (ronda_numero > 0),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  monto_pozo numeric(12,2) not null check (monto_pozo > 0),
  entregado_en timestamptz,
  observaciones text,
  created_at timestamptz not null default now(),
  unique(junta_id, ronda_numero)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  junta_id uuid not null references public.juntas(id) on delete cascade,
  enviado_por uuid not null references public.profiles(id) on delete cascade,
  email text,
  celular text,
  estado public.invitation_estado not null default 'pendiente',
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (email is not null or celular is not null)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  junta_id uuid references public.juntas(id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  tipo text not null default 'in-app',
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  junta_id uuid references public.juntas(id),
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_juntas_admin on public.juntas(admin_id);
create index idx_members_profile on public.junta_members(profile_id);
create index idx_schedules_junta_estado on public.payment_schedules(junta_id, estado);
create index idx_payments_junta_estado on public.payments(junta_id, estado);
create index idx_notifications_profile_leida on public.notifications(profile_id, leida);
create index idx_audit_logs_junta on public.audit_logs(junta_id, created_at desc);

create or replace function public.is_junta_member(_junta_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.junta_members jm
    where jm.junta_id = _junta_id and jm.profile_id = auth.uid() and jm.estado <> 'retirado'
  );
$$;

create or replace function public.is_junta_admin(_junta_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1 from public.junta_members jm
    where jm.junta_id = _junta_id and jm.profile_id = auth.uid() and jm.rol = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.juntas enable row level security;
alter table public.junta_members enable row level security;
alter table public.payment_schedules enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self access" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "juntas visible for members" on public.juntas for select using (public.is_junta_member(id) or admin_id = auth.uid());
create policy "juntas insert by owner" on public.juntas for insert with check (admin_id = auth.uid());
create policy "juntas update by admin" on public.juntas for update using (public.is_junta_admin(id) or admin_id = auth.uid());

create policy "members visible in own junta" on public.junta_members for select using (public.is_junta_member(junta_id));
create policy "members manage by admin" on public.junta_members for all using (public.is_junta_admin(junta_id)) with check (public.is_junta_admin(junta_id));

create policy "schedule visible by members" on public.payment_schedules for select using (public.is_junta_member(junta_id));
create policy "schedule manage by admin" on public.payment_schedules for all using (public.is_junta_admin(junta_id)) with check (public.is_junta_admin(junta_id));

create policy "payments visible by members" on public.payments for select using (public.is_junta_member(junta_id) or profile_id = auth.uid());
create policy "payments create by member" on public.payments for insert with check (profile_id = auth.uid() and public.is_junta_member(junta_id));
create policy "payments approve by admin" on public.payments for update using (public.is_junta_admin(junta_id));

create policy "payouts visible by members" on public.payouts for select using (public.is_junta_member(junta_id));
create policy "payouts manage by admin" on public.payouts for all using (public.is_junta_admin(junta_id));

create policy "invitations visible by admin" on public.invitations for select using (public.is_junta_admin(junta_id));
create policy "invitations manage by admin" on public.invitations for all using (public.is_junta_admin(junta_id));

create policy "notifications self access" on public.notifications for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "audit visible by admin" on public.audit_logs for select using (public.is_junta_admin(junta_id));
create policy "audit insert by member" on public.audit_logs for insert with check (actor_id = auth.uid());
