-- Ensure DNI uniqueness remains a DB-level source of truth and fail safely on historical duplicates.

create or replace function public.normalize_digits(input text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(input, ''), '\\D', '', 'g'), '');
$$;

-- Normalize stored identity values before validation/index checks.
update public.profiles
set dni = public.normalize_digits(dni)
where dni is not null
  and dni <> public.normalize_digits(dni);

update public.profiles
set celular = public.normalize_digits(celular)
where celular is not null
  and celular <> public.normalize_digits(celular);

do $$
begin
  if exists (
    select 1
    from public.profiles p
    where public.normalize_digits(p.dni) is not null
    group by public.normalize_digits(p.dni)
    having count(*) > 1
  ) then
    raise exception 'Se detectaron DNIs duplicados en public.profiles. Limpia duplicados antes de aplicar unicidad.';
  end if;
end
$$;

alter table public.profiles
  drop constraint if exists profiles_dni_format_chk;

alter table public.profiles
  add constraint profiles_dni_format_chk
  check (dni is null or public.normalize_digits(dni) ~ '^\\d{8}$');

create unique index if not exists profiles_dni_unique_digits_idx
  on public.profiles ((public.normalize_digits(dni)))
  where dni is not null;

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
