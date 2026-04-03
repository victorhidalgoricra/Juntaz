-- Example system admin role seed (replace UUID with existing auth user id in your project)
insert into public.profiles (id, nombre, celular, email)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Admin Plataforma', '900000000', 'admin@juntasdigitales.pe')
on conflict (id) do update set email = excluded.email;

insert into public.user_global_roles (profile_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'system_admin')
on conflict do nothing;
