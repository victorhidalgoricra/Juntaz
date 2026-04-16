-- Add payout preference fields to profiles for participant-to-participant payment instructions.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists second_name text,
  add column if not exists paternal_last_name text,
  add column if not exists preferred_payout_method text
    check (preferred_payout_method in ('yape', 'plin', 'bank_account', 'cash', 'other')),
  add column if not exists payout_account_name text,
  add column if not exists payout_phone_number text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_number text,
  add column if not exists payout_cci text,
  add column if not exists payout_notes text;

-- Backfill first_name from existing nombre as a safe baseline.
update public.profiles
set first_name = split_part(trim(nombre), ' ', 1)
where first_name is null
  and coalesce(trim(nombre), '') <> '';
