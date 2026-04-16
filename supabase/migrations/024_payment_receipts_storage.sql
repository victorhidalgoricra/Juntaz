-- Create and secure storage bucket for payment receipts (vouchers).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'payment_receipts_insert_authenticated'
  ) then
    create policy payment_receipts_insert_authenticated
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'payment-receipts'
        and coalesce((storage.foldername(name))[2], '') = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'payment_receipts_update_authenticated'
  ) then
    create policy payment_receipts_update_authenticated
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'payment-receipts'
        and coalesce((storage.foldername(name))[2], '') = auth.uid()::text
      )
      with check (
        bucket_id = 'payment-receipts'
        and coalesce((storage.foldername(name))[2], '') = auth.uid()::text
      );
  end if;
end $$;
