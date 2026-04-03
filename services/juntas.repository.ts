import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { Junta } from '@/types/domain';

export async function createJuntaRecord(junta: Junta) {
  if (!hasSupabase || !supabase) {
    return { ok: true as const, source: 'mock' as const };
  }

  const { error } = await supabase.from('juntas').insert({
    id: junta.id,
    admin_id: junta.admin_id,
    slug: junta.slug,
    invite_token: junta.invite_token,
    nombre: junta.nombre,
    descripcion: junta.descripcion,
    moneda: junta.moneda,
    participantes_max: junta.participantes_max,
    monto_cuota: junta.monto_cuota,
    frecuencia_pago: junta.frecuencia_pago,
    fecha_inicio: junta.fecha_inicio,
    dia_limite_pago: junta.dia_limite_pago,
    premio_primero_pct: junta.premio_primero_pct,
    descuento_ultimo_pct: junta.descuento_ultimo_pct,
    fee_plataforma_pct: junta.fee_plataforma_pct,
    penalidad_mora: junta.penalidad_mora,
    visibilidad: junta.visibilidad,
    cerrar_inscripciones: junta.cerrar_inscripciones,
    estado: junta.estado
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, source: 'supabase' as const };
}
