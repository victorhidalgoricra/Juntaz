-- Auto-create profile rows for auth users + backfill missing profiles
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, celular, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', '000000000'),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        nombre = coalesce(public.profiles.nombre, excluded.nombre);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

insert into public.profiles (id, nombre, celular, email)
select
  au.id,
  coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  coalesce(au.raw_user_meta_data->>'phone', '000000000'),
  au.email
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;
