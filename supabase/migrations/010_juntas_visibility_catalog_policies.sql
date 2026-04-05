-- Catalog visibility: public juntas readable by anyone, private juntas readable by authenticated users
do $$ begin
  create policy "juntas anon public read" on public.juntas
  for select using (
    visibilidad = 'publica'
    and estado in ('borrador', 'activa')
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "juntas authenticated catalog read" on public.juntas
  for select using (
    auth.uid() is not null
    and estado in ('borrador', 'activa')
  );
exception when duplicate_object then null;
end $$;
