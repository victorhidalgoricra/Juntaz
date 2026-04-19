'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { isJuntaActive } from '@/lib/junta-status';
import { APP_BUSINESS_TIMEZONE, isJuntaBlockedByDeadline } from '@/lib/junta-blocking';
import { getActiveMemberCountByJunta, isUserMember } from '@/lib/junta-members';
import {
  activateJuntaIfReady,
  deleteDraftJunta,
  fetchPublicJuntas,
  fetchUserJuntaSnapshot,
  findJuntaByAccessCode,
  joinJuntaAsParticipant,
  leaveJuntaAsParticipant
} from '@/services/juntas.repository';

const filters = [
  { id: 'todas', label: 'Todas' },
  { id: 'publica', label: 'Públicas' },
  { id: 'privada', label: 'Privadas' },
  { id: 'mis', label: 'Mis participaciones' }
] as const;

type FilterId = (typeof filters)[number]['id'];

export default function JuntasDisponiblesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));
  const allMembers = useAppStore((s) => (Array.isArray(s.members) ? s.members : []));
  const setData = useAppStore((s) => s.setData);
  const addNotification = useAppStore((s) => s.addNotification);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [joinErrorByJunta, setJoinErrorByJunta] = useState<Record<string, string>>({});
  const [activationFeedbackByJunta, setActivationFeedbackByJunta] = useState<Record<string, string>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('todas');

  const reloadCatalog = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [catalogResult, snapshotResult] = await Promise.all([
      fetchPublicJuntas(),
      fetchUserJuntaSnapshot(user.id)
    ]);

    if (!catalogResult.ok) {
      console.error('[Juntas disponibles] error loading catalog', catalogResult.message);
      setError('No pudimos cargar las juntas disponibles. Intenta nuevamente.');
      setLoading(false);
      return;
    }

    setData({
      juntas: catalogResult.data,
      ...(snapshotResult.ok
        ? {
          members: snapshotResult.data.members,
          schedules: snapshotResult.data.schedules,
          payments: snapshotResult.data.payments,
          payouts: snapshotResult.data.payouts
        }
        : {})
    });
    if (!snapshotResult.ok) {
      console.error('[Juntas disponibles] error loading snapshot', snapshotResult.message);
    }
    setLoading(false);
  }, [user, setData]);

  useEffect(() => {
    reloadCatalog();
  }, [reloadCatalog]);

  const countByJunta = useMemo(() => getActiveMemberCountByJunta(allJuntas, allMembers), [allJuntas, allMembers]);

  const visibleJuntas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allJuntas.filter((j) => {
      const isMine = j.admin_id === user?.id || isUserMember({ juntaId: j.id, userId: user?.id, members: allMembers });
      const passesFilter =
        activeFilter === 'todas' ||
        (activeFilter === 'publica' && j.visibilidad === 'publica') ||
        (activeFilter === 'privada' && j.visibilidad === 'privada') ||
        (activeFilter === 'mis' && isMine);

      const passesQuery =
        normalizedQuery.length === 0 ||
        j.nombre.toLowerCase().includes(normalizedQuery) ||
        (j.descripcion ?? '').toLowerCase().includes(normalizedQuery);

      return passesFilter && passesQuery;
    });
  }, [activeFilter, allJuntas, allMembers, query, user?.id]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    console.log(
      '[Juntas disponibles] debug catalog snapshot',
      visibleJuntas.map((junta) => ({
        juntaId: junta.id,
        is_member_current_user: isUserMember({ juntaId: junta.id, userId: user?.id, members: allMembers }),
        isOwner: junta.admin_id === user?.id,
        integrantes_actuales: Number(junta.integrantes_actuales ?? 0)
      }))
    );
  }, [allMembers, user?.id, visibleJuntas]);

  if (!user) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Juntas disponibles</h1>
        <p className="text-sm text-slate-600">Explora juntas públicas o accede a una privada con tu enlace o código.</p>
        <Link href="/login?redirect=/juntas">
          <Button>Iniciar sesión</Button>
        </Link>
      </Card>
    );
  }

  const handlePrivateAccess = async () => {
    setCodeError(null);
    const normalizedCode = accessCode.trim().toUpperCase();
    if (!normalizedCode) {
      setCodeError('Ingresa un código para continuar.');
      return;
    }

    const result = await findJuntaByAccessCode(normalizedCode);
    if (!result.ok) {
      setCodeError(result.message);
      return;
    }

    if (!result.data) {
      setCodeError('Código inválido. Revisa el código e inténtalo de nuevo.');
      return;
    }

    const foundJunta = result.data;
    setData({ juntas: [foundJunta, ...allJuntas.filter((j) => j.id !== foundJunta.id)] });
    window.location.href = `/juntas/${foundJunta.id}`;
  };

  const handleJoin = async (juntaId: string, accessCode?: string) => {
    setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: '' }));
    setJoiningId(juntaId);

    const result = await joinJuntaAsParticipant({ juntaId, profileId: user.id, accessCode });
    if (!result.ok) {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: result.message }));
      setJoiningId(null);
      return;
    }

    const snapshot = await fetchUserJuntaSnapshot(user.id);
    if (snapshot.ok) {
      setData({
        members: snapshot.data.members,
        schedules: snapshot.data.schedules,
        payments: snapshot.data.payments,
        payouts: snapshot.data.payouts
      });
    } else {
      setData({
        members: [...allMembers, result.data],
        juntas: allJuntas.map((j) => (j.id === juntaId ? { ...j, integrantes_actuales: Number(j.integrantes_actuales ?? 0) + 1 } : j))
      });
    }
    const joinedJunta = allJuntas.find((item) => item.id === juntaId);
    addNotification({
      profile_id: user.id,
      titulo: 'Te uniste a una junta',
      mensaje: `Ahora participas en ${joinedJunta?.nombre ?? 'tu nueva junta'}.`,
      leida: false
    });
    await reloadCatalog();
    setJoiningId(null);
  };

  const handleAccessPrivate = async (juntaId: string) => {
    const code = window.prompt('Ingresa el código de acceso de la junta privada');
    if (!code || code.trim().length === 0) {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: 'Esta junta privada requiere enlace o código válido.' }));
      return;
    }
    await handleJoin(juntaId, code.trim().toUpperCase());
  };

  const handleLeave = async (juntaId: string) => {
    setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: '' }));
    const junta = allJuntas.find((item) => item.id === juntaId);
    if (!junta) return;
    if (junta.estado === 'activa') {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: 'No puedes retirarte de una junta activa.' }));
      return;
    }

    setLeavingId(juntaId);
    const result = await leaveJuntaAsParticipant({ juntaId });
    if (!result.ok) {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: result.message }));
      setLeavingId(null);
      return;
    }

    const snapshot = await fetchUserJuntaSnapshot(user.id);
    if (snapshot.ok) {
      setData({
        members: snapshot.data.members,
        schedules: snapshot.data.schedules,
        payments: snapshot.data.payments,
        payouts: snapshot.data.payouts
      });
    } else {
      setData({
        members: allMembers.filter((member) => !(member.junta_id === juntaId && member.profile_id === user.id)),
        juntas: allJuntas.map((item) => (item.id === juntaId ? { ...item, integrantes_actuales: Math.max(Number(item.integrantes_actuales ?? 0) - 1, 0) } : item))
      });
    }
    await reloadCatalog();
    setLeavingId(null);
  };

  const handleActivate = async (juntaId: string) => {
    const junta = allJuntas.find((item) => item.id === juntaId);
    if (!junta) return;

    const miembrosActuales = countByJunta.get(juntaId) ?? Number(junta.integrantes_actuales ?? 0);
    const cupoCompleto = miembrosActuales >= junta.participantes_max;

    setActivationFeedbackByJunta((prev) => ({ ...prev, [juntaId]: '' }));
    setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: '' }));

    if (!cupoCompleto) {
      setActivationFeedbackByJunta((prev) => ({
        ...prev,
        [juntaId]: 'Completa todos los integrantes para activar la junta'
      }));
      return;
    }

    setActivatingId(juntaId);

    const result = await activateJuntaIfReady({ juntaId });
    if (!result.ok) {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: result.message }));
      setActivatingId(null);
      return;
    }

    setData({
      juntas: allJuntas.map((item) => (item.id === juntaId ? { ...item, ...result.data } : item))
    });
    setActivationFeedbackByJunta((prev) => ({ ...prev, [juntaId]: '' }));
    setActivatingId(null);
  };

  const handleDelete = async (juntaId: string, juntaAdminId: string) => {
    const currentProfileId = user?.id;
    if (!currentProfileId) {
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: 'No pudimos validar tu perfil. Vuelve a iniciar sesión.' }));
      return;
    }

    if (!juntaId) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Juntas disponibles] delete blocked: invalid junta id', { juntaId });
      }
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: 'No pudimos eliminar la junta. Intenta nuevamente.' }));
      return;
    }

    const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta junta? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;

    setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: '' }));
    setDeletingId(juntaId);

    if (process.env.NODE_ENV === 'development') {
      const sessionResult = hasSupabase && supabase ? await supabase.auth.getSession() : null;
      console.log('delete session before', {
        userInStore: user?.id ?? null,
        supabaseSessionUser: sessionResult?.data.session?.user?.id ?? null,
        supabaseSessionError: sessionResult?.error ?? null
      });
      console.log('delete junta id', juntaId);
      console.log('delete junta admin_id', juntaAdminId);
      console.log('delete currentProfileId', currentProfileId);
      console.log('delete payload', { p_junta_id: juntaId, p_user_id: currentProfileId });
    }

    const result = await deleteDraftJunta({ juntaId, currentProfileId });
    if (!result.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Juntas disponibles] delete failed', { juntaId, message: result.message });
      }
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: result.message }));
      setDeletingId(null);
      return;
    }

    try {
      setData({ members: allMembers.filter((member) => member.junta_id !== juntaId) });
      setDeletingId(null);
      await reloadCatalog();
      alert('Junta eliminada correctamente.');

      if (process.env.NODE_ENV === 'development') {
        const sessionResult = hasSupabase && supabase ? await supabase.auth.getSession() : null;
        console.log('delete session after', {
          userInStore: user?.id ?? null,
          supabaseSessionUser: sessionResult?.data.session?.user?.id ?? null,
          supabaseSessionError: sessionResult?.error ?? null
        });
        console.log('delete redirect route', '/juntas');
      }

      router.replace('/juntas');
    } catch (postDeleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Juntas disponibles] post-delete error', postDeleteError);
      }
      setJoinErrorByJunta((prev) => ({ ...prev, [juntaId]: 'La junta se eliminó, pero ocurrió un error al actualizar la vista.' }));
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Juntas disponibles</h1>
          <p className="text-sm text-slate-200">Explora juntas públicas o accede a una privada con tu enlace o código.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
          <Input
            placeholder="Buscar por nombre o descripción"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-slate-500 bg-white/95 text-slate-900"
          />
          <Input
            placeholder="Ej: PRIV-8KQ2"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
            className="border-slate-500 bg-white/95 text-slate-900"
          />
          <Button onClick={handlePrivateAccess}>Ingresar con código</Button>
        </div>
        {codeError && <p className="text-xs text-rose-200">{codeError}</p>}

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === filter.id ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="h-44 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}
      {error && <Card><p className="text-sm text-red-600">Error cargando juntas: {error}</p></Card>}

      {!loading && !error && (visibleJuntas.length === 0 ? (
        <Card className="space-y-2 border-dashed p-8 text-center">
          <p className="text-lg font-semibold">Sin resultados para este filtro</p>
          <p className="text-sm text-slate-600">Prueba cambiar de filtro, buscar otro término o ingresar un código privado.</p>
          <Link href="/juntas/new"><Button>Crear nueva junta</Button></Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleJuntas.map((j) => {
            const juntaId = j.id;
            const isOwner = j.admin_id === user.id;
            const isMember = isUserMember({ juntaId, userId: user.id, members: allMembers });
            const description = j.descripcion?.trim() || 'Junta sin descripción aún.';
            const miembrosActuales = countByJunta.get(juntaId) ?? 0;
            const cupoCompleto = miembrosActuales >= j.participantes_max;
            const estadoVisual = isJuntaActive(j.estado) ? 'activa' : cupoCompleto ? 'completa' : 'borrador';
            const isBlocked = isJuntaBlockedByDeadline(j);
            const roleState = isOwner ? 'owner' : isMember ? 'member' : 'visitor';
            const isActive = isJuntaActive(j.estado);
            const canActivate = roleState === 'owner' && !isActive && !isBlocked;
            const canDelete = roleState === 'owner' && !isBlocked;
            const canLeave = roleState === 'member' && !isActive && !isBlocked;
            const canJoinPublic = roleState === 'visitor' && !cupoCompleto && j.visibilidad === 'publica' && !isBlocked;
            const canAccessPrivate = roleState === 'visitor' && !cupoCompleto && j.visibilidad === 'privada' && !isBlocked;
            const actionBranch = roleState === 'owner' ? 'owner-actions' : roleState === 'member' ? 'member-actions' : 'visitor-actions';

            if (process.env.NODE_ENV === 'development') {
              console.log('[Juntas card render]', {
                juntaId,
                juntaAdminId: j.admin_id ?? null,
                currentUserId: user.id ?? null,
                isOwner,
                roleState,
                actionBranch
              });
            }

            return (
              <Card key={juntaId} className="flex h-full flex-col justify-between gap-4 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold leading-tight">{j.nombre}</h3>
                    <Badge>{j.visibilidad === 'publica' ? 'Pública' : 'Privada'}</Badge>
                  </div>
                  {isBlocked && <Badge>Bloqueada</Badge>}
                  <p className="text-sm text-slate-600">{description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p><span className="font-medium">Frecuencia:</span> {j.frecuencia_pago}</p>
                    <p><span className="font-medium">Cuota base:</span> S/ {j.cuota_base ?? j.monto_cuota}</p>
                    <p><span className="font-medium">Inicio:</span> {j.fecha_inicio}</p>
                    <p><span className="font-medium">Tipo:</span> {j.tipo_junta === 'incentivo' ? 'Incentivos' : 'Normal'}</p>
                    <p><span className="font-medium">Integrantes:</span> {miembrosActuales}/{j.participantes_max}</p>
                    <p><span className="font-medium">Estado:</span> {estadoVisual}</p>
                  </div>

                  {cupoCompleto && <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">Cupo completo</div>}
                  {isBlocked && (
                    <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                      Junta bloqueada por no activarse antes de la fecha del primer pago ({APP_BUSINESS_TIMEZONE}).
                    </div>
                  )}
                  {j.visibilidad === 'privada' && <div className="rounded-md bg-slate-100 p-2 text-xs text-slate-700">Requiere enlace o código de acceso.</div>}
                  {roleState === 'owner' && <div className="rounded-md bg-indigo-50 p-2 text-xs text-indigo-700">Eres el creador de esta junta.</div>}
                  {roleState === 'member' && <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">Participando</div>}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/juntas/${juntaId}`}><Button variant="outline">Ver detalle</Button></Link>
                    {roleState === 'owner' && !isActive && (
                      <Button
                        disabled={!canActivate || activatingId === juntaId}
                        onClick={() => handleActivate(juntaId)}
                      >
                        {activatingId === juntaId ? 'Activando...' : 'Activar junta'}
                      </Button>
                    )}
                    {roleState === 'owner' && !isActive && canDelete && (
                      <Button
                        variant="destructive"
                        disabled={deletingId === juntaId}
                        onClick={() => handleDelete(juntaId, j.admin_id)}
                      >
                        {deletingId === juntaId ? 'Eliminando...' : 'Eliminar junta'}
                      </Button>
                    )}
                    {roleState === 'member' && !isActive && (
                      <Button
                        variant="ghost"
                        disabled={!canLeave || leavingId === juntaId}
                        onClick={() => handleLeave(juntaId)}
                      >
                        {leavingId === juntaId ? 'Retirándome...' : 'Retirarme'}
                      </Button>
                    )}
                    {roleState === 'visitor' && !isActive && (
                      j.visibilidad === 'privada'
                        ? <Button disabled={!canAccessPrivate || joiningId === juntaId} onClick={() => handleAccessPrivate(juntaId)}>{joiningId === juntaId ? 'Validando...' : 'Acceder con código'}</Button>
                        : <Button disabled={!canJoinPublic || joiningId === juntaId} onClick={() => handleJoin(juntaId)}>{joiningId === juntaId ? 'Uniéndome...' : 'Unirme'}</Button>
                    )}
                  </div>
                  {isBlocked && <p className="text-xs text-rose-700">No se permiten nuevas uniones ni activación.</p>}
                  {roleState === 'owner' && activationFeedbackByJunta[juntaId] && (
                    <p className="text-xs text-amber-700">{activationFeedbackByJunta[juntaId]}</p>
                  )}
                  {roleState === 'visitor' && !isActive && j.visibilidad === 'privada' && (
                    <p className="text-xs text-slate-600">Requiere enlace o código de acceso</p>
                  )}
                  {roleState === 'visitor' && !isActive && cupoCompleto && (
                    <p className="text-xs text-slate-600">Cupo completo</p>
                  )}
                  {joinErrorByJunta[juntaId] && !(roleState === 'owner' && joinErrorByJunta[juntaId].includes('creador no puede retirarse')) && (
                    <p className="text-xs text-red-600">{joinErrorByJunta[juntaId]}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
