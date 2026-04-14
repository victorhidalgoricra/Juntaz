-- Harden profile identity data for registration and conflict checks.

create or replace function public.normalize_digits(input text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(input, ''), '\\D', '', 'g'), '');
$$;

alter table public.profiles
  add constraint profiles_dni_format_chk
  check (dni is null or public.normalize_digits(dni) ~ '^\\d{8}$');

alter table public.profiles
  add constraint profiles_celular_format_chk
  check (public.normalize_digits(celular) ~ '^\\d{9,11}$');

create unique index if not exists profiles_dni_unique_digits_idx
  on public.profiles ((public.normalize_digits(dni)))
  where dni is not null;

create unique index if not exists profiles_celular_unique_digits_idx
  on public.profiles ((public.normalize_digits(celular)));

create or replace function public.check_profile_conflicts(p_dni text, p_celular text)
returns table(exists_dni boolean, exists_celular boolean)
language sql
security definer
set search_path = public
as $$
  select
    exists(
      select 1
      from public.profiles p
      where public.normalize_digits(p.dni) = public.normalize_digits(p_dni)
    ) as exists_dni,
    exists(
      select 1
      from public.profiles p
      where public.normalize_digits(p.celular) = public.normalize_digits(p_celular)
    ) as exists_celular;
$$;

grant execute on function public.check_profile_conflicts(text, text) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
  normalized_dni text;
begin
  normalized_phone := public.normalize_digits(new.raw_user_meta_data->>'phone');
  normalized_dni := public.normalize_digits(new.raw_user_meta_data->>'dni');

  if normalized_phone is null then
    raise exception 'El celular es obligatorio para el registro.';
  end if;

  if normalized_dni is null then
    raise exception 'El DNI es obligatorio para el registro.';
  end if;

  insert into public.profiles (id, nombre, celular, email, dni)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    normalized_phone,
    new.email,
    normalized_dni
  )
  on conflict (id) do update
    set email = excluded.email,
        nombre = coalesce(public.profiles.nombre, excluded.nombre),
        celular = coalesce(nullif(public.normalize_digits(public.profiles.celular), ''), excluded.celular),
        dni = coalesce(nullif(public.normalize_digits(public.profiles.dni), ''), excluded.dni);

  return new;
end;
$$;
