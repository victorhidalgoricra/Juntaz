'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { activateJuntaIfReady, deleteDraftJunta, fetchJuntaById, fetchMembersByJuntaIds } from '@/services/juntas.repository';
import { calcularSimulacionJunta } from '@/services/incentive.service';
import { Junta } from '@/types/domain';
import { hasSupabase } from '@/lib/env';
import { formatIncentiveLabel, getAvatarColor, getInitial } from '@/lib/profile-display';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { isJuntaActive } from '@/lib/junta-status';

type DetailView = 'admin' | 'participante';
type WeeklyPaymentStatus = 'Pagado' | 'Pendiente' | 'Validando' | 'Vencido' | 'Exonerado' | 'Rechazado' | 'En formación';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, members, payments, schedules, setData } = useAppStore();

  const storeJunta = juntas.find((j) => j.id === params.id) ?? null;
  const [junta, setJunta] = useState<Junta | null>(storeJunta);
  const [loadingJunta, setLoadingJunta] = useState(!storeJunta);
  const requestedView = searchParams.get('view');
  const [activeView, setActiveView] = useState<DetailView>('participante');
  const [participantPaymentMessage, setParticipantPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (storeJunta) {
        setJunta(storeJunta);
      } else {
        setLoadingJunta(true);
        const result = await fetchJuntaById(params.id);
        if (result.ok && result.data) {
          setJunta(result.data);
          setData({ juntas: [result.data, ...juntas.filter((j) => j.id !== result.data!.id)] });
        }
      }

      if (hasSupabase) {
        const membersResult = await fetchMembersByJuntaIds([params.id]);
        if (membersResult.ok && membersResult.data.length > 0) {
          setData({ members: membersResult.data });
        }
      }

      setLoadingJunta(false);
    };
    load();
  }, [storeJunta, params.id, setData, juntas]);

  const miembros = useMemo(() => members.filter((m) => m.junta_id === params.id), [members, params.id]);
  const miembrosNormalizados = useMemo(() => {
    if (!junta) return miembros;
    const tieneAdmin = miembros.some((m) => m.profile_id === junta.admin_id);
    if (tieneAdmin) return miembros;
    return [
      { id: `local-admin-${junta.id}`, junta_id: junta.id, profile_id: junta.admin_id, estado: 'activo' as const, rol: 'admin' as const, orden_turno: 1 },
      ...miembros
    ];
  }, [junta, miembros]);

  const miembrosActivos = miembrosNormalizados.filter((member) => member.estado === 'activo');
  const miembrosActuales = miembrosActivos.length;

  const simulacion = useMemo(() => {
    if (!junta) return null;
    return calcularSimulacionJunta({
      participantes: junta.participantes_max,
      cuotaBase: junta.cuota_base ?? junta.monto_cuota,
      fechaInicio: junta.fecha_inicio,
      frecuencia: junta.frecuencia_pago,
      tipoJunta: junta.tipo_junta ?? 'normal',
      incentivoPorcentaje: junta.incentivo_porcentaje ?? 0,
      incentivoPorTurno: junta.incentivo_turnos
    });
  }, [junta]);

  const juntaActiva = isJuntaActive(junta?.estado);
  const isCreator = user?.id === junta?.admin_id;
  const isCurrentUserMember = miembrosActivos.some((member) => member.profile_id === user?.id);
  const isBackofficeAdmin = user?.global_role === 'admin';
  const canViewAdmin = isCreator;
  const canViewParticipant = isCurrentUserMember || isCreator;
  const defaultView: DetailView = canViewAdmin ? 'admin' : 'participante';

  useEffect(() => {
    if (requestedView === 'admin' || requestedView === 'participante') {
      setActiveView(requestedView);
      return;
    }

    const fallbackView = defaultView;
    setActiveView(fallbackView);
    if (requestedView) {
      router.replace(`/juntas/${params.id}?view=${fallbackView}`);
    }
  }, [requestedView, defaultView, router, params.id]);

  useEffect(() => {
    if (juntaActiva) setParticipantPaymentMessage(null);
  }, [juntaActiva]);

  if (loadingJunta) return <Card>Cargando junta...</Card>;
  if (!junta || !simulacion) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  const currentWeek = Math.max(1, Math.min(simulacion.rows.length, miembrosActuales));
  const myMember = miembrosActivos.find((member) => member.profile_id === user?.id) ?? null;
  const myTurn = myMember?.orden_turno ?? null;
  const myTurnRow = myTurn ? simulacion.rows.find((row) => row.turno === myTurn) ?? null : null;

  const currentRoundSchedule = schedules
    .filter((s) => s.junta_id === junta.id && s.cuota_numero === currentWeek)
    .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];

  const weeklyMemberRows = miembrosActivos.map((member, index) => {
    const displayName = member.profile_id === junta.admin_id ? 'Creador' : member.profile_id === user?.id ? 'Tú' : `Integrante ${index + 1}`;
    const memberPayment = payments.find((p) => p.junta_id === junta.id && p.profile_id === member.profile_id && p.schedule_id === currentRoundSchedule?.id);
    const normalized = normalizePaymentStatus(memberPayment?.estado);
    const paymentStatus: WeeklyPaymentStatus = !juntaActiva
      ? 'En formación'
      : currentRoundSchedule?.estado === 'vencida' && !memberPayment
        ? 'Vencido'
        : normalized === 'approved'
          ? 'Pagado'
          : normalized === 'submitted' || normalized === 'validating'
            ? 'Validando'
            : normalized === 'rejected'
              ? 'Rechazado'
              : normalized === 'overdue'
                ? 'Vencido'
                : 'Pendiente';
    const trustScore = Math.max(60, 92 - Math.abs(member.orden_turno - currentWeek) * 2);

    return {
      id: member.id,
      displayName,
      turno: member.orden_turno,
      memberType: member.rol === 'admin' ? 'propietario' : 'participante',
      trustScore,
      paymentStatus
    };
  });

  const paidCount = weeklyMemberRows.filter((member) => member.paymentStatus === 'Pagado').length;
  const pendingCount = weeklyMemberRows.filter((member) => member.paymentStatus !== 'Pagado').length;

  const participantPayment = currentRoundSchedule
    ? payments.find((payment) => payment.junta_id === junta.id && payment.profile_id === user?.id && payment.schedule_id === currentRoundSchedule.id)
    : null;
  const participantStatus: WeeklyPaymentStatus = !juntaActiva
    ? 'En formación'
    : currentRoundSchedule?.estado === 'vencida' && !participantPayment
      ? 'Vencido'
      : (() => {
        const normalized = normalizePaymentStatus(participantPayment?.estado);
        if (normalized === 'approved') return 'Pagado';
        if (normalized === 'submitted' || normalized === 'validating') return 'Validando';
        if (normalized === 'rejected') return 'Rechazado';
        if (normalized === 'overdue') return 'Vencido';
        return 'Pendiente';
      })();

  const urgencyBanner = (() => {
    const dueText = currentRoundSchedule?.fecha_vencimiento ? new Date(currentRoundSchedule.fecha_vencimiento).toLocaleDateString('es-PE') : 'hoy 12:00pm';
    const cuota = junta.cuota_base ?? junta.monto_cuota;
    if (!juntaActiva) return 'La junta aún está en formación. Los pagos se habilitan cuando esté activa.';
    if (participantStatus === 'Validando') return 'Tu pago está en validación.';
    if (participantStatus === 'Pagado') return 'Ya pagaste esta semana.';
    if (myTurn === currentWeek) return 'Tu turno es esta semana.';
    if (pendingCount > 0 && participantStatus === 'Pendiente') return `Tienes hasta ${dueText} para pagar S/${cuota.toFixed(2)}. Quedan 3 horas.`;
    return `Hay ${pendingCount} integrante(s) pendiente(s).`;
  })();

  const incentivoLabel = formatIncentiveLabel({
    tipoJunta: junta.tipo_junta,
    incentivoPorcentaje: junta.incentivo_porcentaje,
    incentivoRegla: junta.incentivo_regla
  });

  const bolsaSemanal = (junta.cuota_base ?? junta.monto_cuota) * miembrosActuales;
  const faltantes = Math.max(junta.participantes_max - miembrosActuales, 0);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/junta/${junta.slug}` : `/junta/${junta.slug}`;

  const statusColor = (status: WeeklyPaymentStatus) => {
    if (status === 'Pagado') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Validando') return 'bg-blue-100 text-blue-700';
    if (status === 'Vencido' || status === 'Rechazado') return 'bg-rose-100 text-rose-700';
    if (status === 'En formación') return 'bg-slate-100 text-slate-700';
    return 'bg-amber-100 text-amber-700';
  };

  const handleSwitchView = (view: DetailView) => {
    if (view === 'admin' && !canViewAdmin) return;
    if (view === 'participante' && !canViewParticipant) return;
    setActiveView(view);
    router.replace(`/juntas/${junta.id}?view=${view}`);
  };

  const handleParticipantPaymentClick = () => {
    if (!juntaActiva) {
      setParticipantPaymentMessage('Aún no puedes registrar pagos porque la junta no está activa.');
      return;
    }
    setParticipantPaymentMessage(null);
    router.push(`/juntas/${junta.id}/registrar-pago`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => handleSwitchView('admin')} disabled={!canViewAdmin} className={`rounded-xl border px-4 py-2 text-sm ${activeView === 'admin' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'} ${!canViewAdmin ? 'cursor-not-allowed opacity-40' : ''}`}>Vista admin</button>
        <button type="button" onClick={() => handleSwitchView('participante')} disabled={!canViewParticipant} className={`rounded-xl border px-4 py-2 text-sm ${activeView === 'participante' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'} ${!canViewParticipant ? 'cursor-not-allowed opacity-40' : ''}`}>Vista participante</button>
      </div>

      {activeView === 'admin' && canViewAdmin && (
        <>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
                <Badge>{junta.estado === 'activa' ? 'Activa' : junta.estado === 'borrador' ? 'En formación' : junta.estado}</Badge>
                <Badge>Semana {currentWeek}/{junta.participantes_max}</Badge>
              </div>
              <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ } }}>Copiar enlace</Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Card><p className="text-xs text-slate-500">Bolsa semanal</p><p className="text-3xl font-semibold">S/{bolsaSemanal.toFixed(0)}</p></Card>
              <Card><p className="text-xs text-slate-500">Cuota base</p><p className="text-3xl font-semibold">S/{(junta.cuota_base ?? junta.monto_cuota).toFixed(0)}</p></Card>
              <Card><p className="text-xs text-slate-500">Incentivo turno</p><p className="text-3xl font-semibold">{junta.tipo_junta === 'incentivo' ? 'Escalonado' : 'Sin incentivo'}</p><p className="text-xs text-slate-500">{junta.tipo_junta === 'incentivo' ? incentivoLabel : 'No aplica para esta junta'}</p></Card>
              <Card><p className="text-xs text-slate-500">Integrantes</p><p className="text-3xl font-semibold">{miembrosActuales}/{junta.participantes_max}</p><p className="text-xs text-slate-500">{faltantes > 0 ? `Faltan ${faltantes}` : 'Grupo completo'}</p></Card>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-xl font-semibold">Integrantes · semana actual</h2>
            <div className="space-y-2">
              {weeklyMemberRows.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(member.displayName)}`}>{getInitial(member.displayName)}</div>
                    <div>
                      <p className="font-medium">{member.displayName}</p>
                      <p className="text-sm text-slate-500">Turno #{member.turno} · {member.memberType} · rating {member.trustScore / 20}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor(member.paymentStatus)}`}>{member.paymentStatus}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">{paidCount}/{miembrosActuales} pagaron esta semana · Cierre ventana: hoy 12:00pm</p>
          </Card>

          <Card className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ } }}>Compartir enlace</Button>
            <Button
              variant="ghost"
              disabled={miembrosActuales < junta.participantes_max || junta.estado === 'activa'}
              onClick={async () => {
                const result = await activateJuntaIfReady({ juntaId: junta.id });
                if (!result.ok) return;
                const nextJunta = { ...junta, ...result.data };
                setJunta(nextJunta);
                setData({ juntas: juntas.map((item) => (item.id === junta.id ? nextJunta : item)) });
              }}
            >
              Activar junta
            </Button>
            {junta.estado !== 'activa' && (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!user) return;
                  const ok = window.confirm('¿Seguro que deseas eliminar esta junta?');
                  if (!ok) return;
                  const result = await deleteDraftJunta({ juntaId: junta.id, currentProfileId: user.id });
                  if (!result.ok) return;
                  setData({ juntas: juntas.filter((item) => item.id !== junta.id), members: members.filter((item) => item.junta_id !== junta.id) });
                  router.replace('/juntas');
                }}
              >
                Eliminar junta
              </Button>
            )}
          </Card>
        </>
      )}

      {activeView === 'participante' && canViewParticipant && (
        <>
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-base font-semibold text-amber-800">{urgencyBanner}</p>
          </Card>

          <Card className="border-0 bg-indigo-50 text-center">
            <p className="text-6xl font-bold text-indigo-700">#{myTurn ?? '-'}</p>
            <p className="text-2xl text-indigo-700">{myTurn === currentWeek ? `Tu turno · Semana ${currentWeek}` : `Tu turno será en semana ${myTurn ?? '-'}`}</p>
            <p className="text-xl text-indigo-700">Recibirás S/{(myTurnRow?.montoRecibido ?? simulacion.bolsaBase).toFixed(0)} · Aporte esta semana S/{(simulacion.rows.find((row) => row.turno === currentWeek)?.cuotaPorRonda ?? (junta.cuota_base ?? junta.monto_cuota)).toFixed(0)}</p>
          </Card>

          <Card>
            <h2 className="mb-2 text-xl font-semibold">Esta semana · semana {currentWeek}</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-2"><p><strong>Tú</strong> · Turno #{myTurn ?? '-'}</p><span className={`rounded-full px-3 py-1 ${statusColor(participantStatus)}`}>{participantStatus}</span></div>
              <div className="flex items-center justify-between rounded-md border p-2"><p><strong>Recibe esta semana:</strong> Turno #{currentWeek}</p><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">En curso</span></div>
              <div className="rounded-md border p-2 text-slate-600">{Math.max(miembrosActuales - 2, 0)} integrantes más · {paidCount} pagaron · {pendingCount} pendientes</div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-xl font-semibold">Tu cronograma completo</h2>
            <div className="space-y-1">
              {simulacion.rows.map((row) => {
                const rowStatus = row.turno < currentWeek ? 'pagado' : row.turno === currentWeek ? participantStatus.toLowerCase() : 'por_venir';
                const isMyTurn = row.turno === myTurn;
                return (
                  <div key={row.turno} className="grid grid-cols-[60px_1fr_1fr] gap-2 border-b py-2 text-sm">
                    <p className={isMyTurn ? 'font-semibold text-indigo-700' : ''}>S{row.turno}</p>
                    <p className={isMyTurn ? 'font-semibold text-indigo-700' : ''}>{row.fechaRonda}</p>
                    <p className={isMyTurn ? 'font-semibold text-indigo-700' : ''}>{isMyTurn ? `Tu turno — recibes S/${row.montoRecibido.toFixed(0)}` : rowStatus === 'pagado' ? `Pagaste S/${row.cuotaPorRonda.toFixed(0)} ✓` : rowStatus === 'vencido' ? `Vencido · S/${row.cuotaPorRonda.toFixed(0)}` : rowStatus === 'validando' ? `Validando · S/${row.cuotaPorRonda.toFixed(0)}` : `Por venir · S/${row.cuotaPorRonda.toFixed(0)}`}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card><p className="text-sm text-slate-500">Score de confianza</p><p className="text-4xl font-semibold text-emerald-700">{Math.max(65, 95 - pendingCount * 3)}</p><p className="text-sm text-slate-600">{paidCount} pagos a tiempo</p></Card>
            <Card><p className="text-sm text-slate-500">Estado de pagos</p><p className="text-4xl font-semibold">{paidCount}/{miembrosActuales}</p><p className="text-sm text-slate-600">Integrantes con pago registrado esta semana</p></Card>
          </div>

          <Card className="flex flex-wrap gap-2">
            <Button
              disabled={participantStatus === 'Pagado'}
              onClick={handleParticipantPaymentClick}
            >
              {participantStatus === 'Pagado' ? 'Pago validado' : 'Registrar pago'}
            </Button>
            {participantPaymentMessage && <p className="text-sm text-amber-700">{participantPaymentMessage}</p>}
          </Card>
        </>
      )}

      {isBackofficeAdmin && (
        <Card className="space-y-2 border-blue-200 bg-blue-50">
          <h2 className="text-lg font-semibold text-blue-800">Módulo backoffice · validación rápida</h2>
          <p className="text-sm text-blue-700">Este usuario tiene permisos de plataforma para revisar pagos en el panel admin.</p>
          <Button variant="outline" onClick={() => router.push('/admin')}>Ir a backoffice</Button>
        </Card>
      )}
    </div>
  );
}
