-- Development helper: grant backoffice role to known admin email.
-- Safe / idempotent: only inserts if profile exists and role is missing.

insert into public.user_global_roles (profile_id, role)
select p.id, 'backoffice_admin'::public.global_role
from public.profiles p
where lower(p.email) = 'vhidalgor10@gmail.com'
on conflict (profile_id, role) do nothing;
