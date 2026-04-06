import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';

export async function ensureProfileExists(input: {
  id: string;
  email: string;
  nombre?: string;
  celular?: string;
}) {
  if (!hasSupabase || !supabase) return { ok: true as const };

  const payload = {
    id: input.id,
    email: input.email,
    nombre: input.nombre?.trim() || input.email.split('@')[0],
    celular: input.celular?.trim() || '000000000'
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}
