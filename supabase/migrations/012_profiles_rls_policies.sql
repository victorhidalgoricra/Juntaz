-- Explicit profiles policies for self select/insert/update
drop policy if exists "profiles self access" on public.profiles;

do $$ begin
  create policy "profiles self select" on public.profiles
  for select using (id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
exception when duplicate_object then null;
end $$;
