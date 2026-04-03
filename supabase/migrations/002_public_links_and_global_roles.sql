-- Add global roles and public invitation link support
do $$ begin
  create type public.global_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_global_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.global_role not null default 'user',
  created_at timestamptz not null default now(),
  unique(profile_id, role)
);

alter table public.juntas
  add column if not exists slug text unique,
  add column if not exists invite_token text unique,
  add column if not exists bloqueada boolean not null default false;

create index if not exists idx_juntas_slug on public.juntas(slug);
create index if not exists idx_juntas_invite_token on public.juntas(invite_token);

alter table public.user_global_roles enable row level security;

create policy "global roles self read" on public.user_global_roles
for select using (profile_id = auth.uid());
