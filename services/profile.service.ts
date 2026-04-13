import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';

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
