-- Extend payment payload for voucher validation workflow.

alter table public.payments
  add column if not exists round_id uuid,
  add column if not exists member_id uuid,
  add column if not exists expected_amount numeric(12,2),
  add column if not exists submitted_amount numeric(12,2),
  add column if not exists payment_method text,
  add column if not exists operation_number text,
  add column if not exists receipt_url text,
  add column if not exists participant_note text,
  add column if not exists payment_status text,
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references public.profiles(id),
  add column if not exists rejection_reason text,
  add column if not exists internal_note text;

create unique index if not exists payments_unique_round_member_active_idx
  on public.payments (junta_id, schedule_id, profile_id)
  where estado in ('pendiente_aprobacion', 'aprobado');
