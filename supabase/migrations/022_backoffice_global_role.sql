-- Enable explicit backoffice admin role.

do $$
begin
  alter type public.global_role add value if not exists 'backoffice_admin';
exception
  when duplicate_object then null;
end $$;
