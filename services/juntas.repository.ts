import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { Junta, JuntaMember } from '@/types/domain';
import { ensureProfileExists } from './profile.service';

const PRIVATE_TOKEN_STORAGE_KEY = 'jd-private-invite-tokens';

function getInviteTokenByJuntaId(juntaId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PRIVATE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[juntaId] ?? null;
  } catch {
    return null;
  }
}

export function saveInviteTokenForJunta(params: { juntaId: string; inviteToken: string }) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PRIVATE_TOKEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[params.juntaId] = params.inviteToken;
    window.localStorage.setItem(PRIVATE_TOKEN_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore localStorage errors in non-critical flow
  }
}

function mapSupabaseErrorMessage(message: string) {
  if (message.includes("Could not find the table 'public.juntas'")) {
    return 'La tabla public.juntas no existe en Supabase. Ejecuta las migraciones SQL del proyecto.';
  }
  if (message.includes('violates foreign key constraint')) {
    return 'No se pudo eliminar la junta porque aún tiene datos relacionados.';
  }
  return message;
}

export async function createJuntaRecord(junta: Junta) {
  if (!hasSupabase || !supabase) {
    return { ok: true as const, source: 'mock' as const };
  }

  const { data: authData } = await supabase.auth.getUser();
  const adminEmail = authData.user?.email || `${junta.admin_id}@placeholder.local`;
  const profileResult = await ensureProfileExists({
    id: junta.admin_id,
    email: adminEmail,
    nombre: authData.user?.user_metadata?.full_name || adminEmail.split('@')[0]
  });
  if (!profileResult.ok) return { ok: false as const, message: profileResult.message };

  const juntaInsertPayload = {
    id: junta.id,
    admin_id: junta.admin_id,
    slug: junta.slug,
    invite_token: junta.invite_token,
    access_code: junta.access_code ?? null,
    tipo_junta: junta.tipo_junta ?? 'normal',
    turn_assignment_mode: junta.turn_assignment_mode ?? 'random',
    incentivo_porcentaje: junta.incentivo_porcentaje ?? 0,
    incentivo_regla: junta.incentivo_regla ?? 'primero_ultimo',
    cuota_base: junta.cuota_base ?? junta.monto_cuota,
    bolsa_base: junta.bolsa_base ?? junta.monto_cuota * junta.participantes_max,
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
  };
  if (process.env.NODE_ENV === 'development') {
    console.log('[createJuntaRecord] step=insert_junta payload', juntaInsertPayload);
  }

  const { data: insertedJunta, error } = await supabase
    .schema('public')
    .from('juntas')
    .insert(juntaInsertPayload)
    .select('id,admin_id,visibilidad,estado')
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createJuntaRecord] step=insert_junta error', error);
    }
    return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[createJuntaRecord] step=insert_junta success', insertedJunta);
  }

  const ownerMemberPayload = {
    junta_id: junta.id,
    profile_id: junta.admin_id,
    estado: 'activo',
    rol: 'admin',
    orden_turno: 1
  };
  if (process.env.NODE_ENV === 'development') {
    console.log('[createJuntaRecord] step=insert_owner_member payload', ownerMemberPayload);
  }

  const { data: insertedMember, error: memberError } = await supabase
    .schema('public')
    .from('junta_members')
    .upsert(ownerMemberPayload)
    .select('id,junta_id,profile_id,estado,rol')
    .maybeSingle();

  if (memberError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createJuntaRecord] step=insert_owner_member error', memberError);
    }
    return { ok: false as const, message: mapSupabaseErrorMessage(memberError.message) };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[createJuntaRecord] step=insert_owner_member success', insertedMember);
  }

  return { ok: true as const, source: 'supabase' as const };
}

export async function fetchMyJuntas(adminId: string) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as Junta[] };

  const { data, error } = await supabase
    .schema('public')
    .from('juntas')
    .select('*')
    .eq('admin_id', adminId)
    .eq('bloqueada', false)
    .order('created_at', { ascending: false });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  return { ok: true as const, data: (data ?? []) as Junta[] };
}

export async function fetchJuntaById(id: string) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: null as Junta | null };

  const { data, error } = await supabase.schema('public').from('juntas').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  return { ok: true as const, data: (data as Junta | null) ?? null };
}

export async function fetchPublicJuntas() {
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as Junta[] };

  const { data, error } = await supabase.schema('public').rpc('catalog_juntas', { p_include_private: false });

  if (error) {
    const fallback = await supabase
      .schema('public')
      .from('juntas')
      .select('id,admin_id,nombre,descripcion,visibilidad,tipo_junta,cuota_base,monto_cuota,frecuencia_pago,fecha_inicio,estado,participantes_max,access_code,slug,created_at')
      .eq('visibilidad', 'publica')
      .in('estado', ['borrador', 'activa'])
      .order('created_at', { ascending: false })
      .limit(200);
    if (fallback.error) return { ok: false as const, message: mapSupabaseErrorMessage(fallback.error.message) };
    return { ok: true as const, data: (fallback.data ?? []) as Junta[] };
  }

  return { ok: true as const, data: (data ?? []) as Junta[] };
}

export async function fetchAvailableJuntas(_userId: string) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as Junta[] };

  const { data, error } = await supabase.schema('public').rpc('catalog_juntas', { p_include_private: true });

  if (error) {
    const fallback = await supabase
      .schema('public')
      .from('juntas')
      .select('id,admin_id,nombre,descripcion,visibilidad,tipo_junta,cuota_base,monto_cuota,frecuencia_pago,fecha_inicio,estado,participantes_max,access_code,slug,created_at')
      .in('estado', ['borrador', 'activa'])
      .order('created_at', { ascending: false })
      .limit(200);
    if (fallback.error) return { ok: false as const, message: mapSupabaseErrorMessage(fallback.error.message) };
    return { ok: true as const, data: (fallback.data ?? []) as Junta[] };
  }

  return { ok: true as const, data: (data ?? []) as Junta[] };
}

export async function findJuntaByAccessCode(accessCode: string) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: null as Junta | null };

  const { data, error } = await supabase.schema('public').rpc('get_junta_by_access_code', { p_access_code: accessCode });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  const junta = Array.isArray(data) ? (data[0] as Junta | undefined) : (data as Junta | null);
  return { ok: true as const, data: junta ?? null };
}

export async function fetchMembersByJuntaIds(juntaIds: string[]) {
  if (juntaIds.length === 0) return { ok: true as const, data: [] as JuntaMember[] };
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as JuntaMember[] };

  const { data, error } = await supabase
    .schema('public')
    .from('junta_members')
    .select('*')
    .in('junta_id', juntaIds)
    .order('created_at', { ascending: true });

  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };
  return { ok: true as const, data: (data ?? []) as JuntaMember[] };
}

export async function joinJuntaAsParticipant(params: { juntaId: string; profileId: string; accessCode?: string }) {
  if (!hasSupabase || !supabase) {
    return {
      ok: true as const,
      data: {
        id: crypto.randomUUID(),
        junta_id: params.juntaId,
        profile_id: params.profileId,
        estado: 'activo' as const,
        rol: 'participante' as const,
        orden_turno: 1
      }
    };
  }

  const inviteToken = getInviteTokenByJuntaId(params.juntaId);
  const { data, error } = await supabase.schema('public').rpc('join_junta_secure', {
    p_junta_id: params.juntaId,
    p_access_code: params.accessCode ?? null,
    p_invite_token: inviteToken ?? null
  });

  if (error) {
    if (error.code === '23505') return { ok: false as const, message: 'Ya formas parte de esta junta.' };
    return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };
  }

  const member = Array.isArray(data) ? (data[0] as JuntaMember | undefined) : (data as JuntaMember | null);
  return { ok: true as const, data: member as JuntaMember };
}

export async function leaveJuntaAsParticipant(params: { juntaId: string }) {
  if (!hasSupabase || !supabase) return { ok: true as const };

  const { error } = await supabase.schema('public').rpc('leave_junta', { p_junta_id: params.juntaId });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  return { ok: true as const };
}

export async function activateJuntaIfReady(params: { juntaId: string }) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: { estado: 'activa' as const } };

  const { data, error } = await supabase.schema('public').rpc('activate_junta_if_ready', { p_junta_id: params.juntaId });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  const junta = Array.isArray(data) ? (data[0] as Junta | undefined) : (data as Junta | null);
  if (!junta) return { ok: false as const, message: 'No se pudo activar la junta.' };

  return { ok: true as const, data: junta };
}

export async function deleteDraftJunta(params: { juntaId: string; currentProfileId: string }) {
  if (!hasSupabase || !supabase) return { ok: true as const };

  const payload = {
    p_junta_id: params.juntaId,
    p_user_id: params.currentProfileId
  };
  const { data, error } = await supabase.schema('public').rpc('delete_junta_with_dependencies', payload);

  if (process.env.NODE_ENV === 'development') {
    console.log('[deleteDraftJunta] rpc payload', payload);
    console.log('[deleteDraftJunta] rpc response', { data, error });
  }

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[deleteDraftJunta] supabase error', error);
    }
    return { ok: false as const, message: 'No pudimos eliminar la junta. Intenta nuevamente.' };
  }

  return { ok: true as const };
}

export type AdminJuntaListItem = {
  id: string;
  nombre: string;
  slug: string;
  estado: Junta['estado'];
  admin_id: string;
  admin_nombre: string | null;
  admin_email: string | null;
  tipo_junta: 'normal' | 'incentivo';
  visibilidad: 'publica' | 'privada';
  participantes_max: number;
  integrantes_actuales: number;
  frecuencia_pago: Junta['frecuencia_pago'];
  fecha_inicio: string;
  created_at: string;
  bloqueada: boolean;
};

export async function fetchAdminJuntas(params?: { includeBlocked?: boolean }) {
  if (!hasSupabase || !supabase) return { ok: true as const, data: [] as AdminJuntaListItem[] };

  const { data, error } = await supabase.schema('public').rpc('admin_list_juntas', {
    p_include_blocked: Boolean(params?.includeBlocked)
  });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  return { ok: true as const, data: (data ?? []) as AdminJuntaListItem[] };
}

export async function adminSoftDeleteJunta(params: { juntaId: string }) {
  if (!hasSupabase || !supabase) {
    return { ok: true as const, data: { id: params.juntaId, bloqueada: true } };
  }

  const { data, error } = await supabase.schema('public').rpc('admin_soft_delete_junta', { p_junta_id: params.juntaId });
  if (error) return { ok: false as const, message: mapSupabaseErrorMessage(error.message) };

  const junta = Array.isArray(data) ? (data[0] as Junta | undefined) : (data as Junta | null);
  if (!junta) return { ok: false as const, message: 'No se pudo eliminar la junta.' };
  return { ok: true as const, data: junta };
}
