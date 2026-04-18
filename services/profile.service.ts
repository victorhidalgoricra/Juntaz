import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { Profile } from '@/types/domain';

const profileSelectFields =
  'id,email,nombre,first_name,second_name,paternal_last_name,celular,dni,foto_url,preferred_payout_method,payout_account_name,payout_phone_number,payout_bank_name,payout_account_number,payout_cci,payout_notes,global_role';

export async function ensureProfileExists(input: {
  id: string;
  email: string;
  nombre?: string;
  celular?: string;
  dni?: string;
}) {
  if (!hasSupabase || !supabase) return { ok: true as const };

  const payload = {
    id: input.id,
    email: input.email,
    nombre: input.nombre?.trim() || input.email.split('@')[0],
    celular: input.celular?.trim() || '000000000',
    dni: input.dni?.trim() || null
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

export async function checkProfileConflicts(input: { dni: string; celular: string }) {
  if (!hasSupabase || !supabase) return { ok: true as const, existsDni: false, existsCelular: false };

  const { data, error } = await supabase.rpc('check_profile_conflicts', {
    p_dni: input.dni,
    p_celular: input.celular
  });

  if (error) return { ok: false as const, message: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true as const,
    existsDni: Boolean(row?.exists_dni),
    existsCelular: Boolean(row?.exists_celular)
  };
}

export async function fetchProfilesByIds(profileIds: string[]) {
  if (profileIds.length === 0) return { ok: true as const, data: [] as Profile[] };
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as Profile[] };

  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .select(profileSelectFields)
    .in('id', profileIds);

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, data: (data ?? []) as Profile[] };
}

export async function fetchProfileById(profileId: string) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: null as Profile | null };

  const { data, error } = await supabase.schema('public').from('profiles').select(profileSelectFields).eq('id', profileId).maybeSingle();
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, data: (data as Profile | null) ?? null };
}

export async function upsertProfile(input: Profile) {
  if (!hasSupabase || !supabase) return { ok: true as const, source: 'mock' as const };

  const payload = {
    id: input.id,
    email: input.email.trim(),
    nombre: input.nombre.trim() || input.email.split('@')[0],
    first_name: input.first_name?.trim() || null,
    second_name: input.second_name?.trim() || null,
    paternal_last_name: input.paternal_last_name?.trim() || null,
    celular: input.celular.trim(),
    dni: input.dni?.trim() || null,
    preferred_payout_method: input.preferred_payout_method ?? null,
    payout_account_name: input.payout_account_name?.trim() || null,
    payout_phone_number: input.payout_phone_number?.trim() || null,
    payout_bank_name: input.payout_bank_name?.trim() || null,
    payout_account_number: input.payout_account_number?.trim() || null,
    payout_cci: input.payout_cci?.trim() || null,
    payout_notes: input.payout_notes?.trim() || null
  };

  const { error } = await supabase.schema('public').from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, source: 'supabase' as const };
}
