'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { activateJuntaIfReady, fetchAvailableJuntas, fetchJuntaById, fetchMembersByJuntaIds, fetchMyActiveMembership, fetchUserJuntaSnapshot, updateJuntaMemberTurns } from '@/services/juntas.repository';
import { calcularSimulacionJunta } from '@/services/incentive.service';
import { Junta } from '@/types/domain';
import { formatIncentiveLabel, getAvatarColor, getInitial } from '@/lib/profile-display';
import { isJuntaActive } from '@/lib/junta-status';
import { APP_BUSINESS_TIMEZONE, isJuntaBlockedByDeadline } from '@/lib/junta-blocking';
import { getActiveMembersForJunta } from '@/lib/junta-members';
import {
  getCurrentWeekSummary,
  getPaidParticipants,
  getPendingPayers,
  getTurnSchedule,
  getUserPersonalJuntaView,
  WeeklyMemberRow
} from '@/lib/junta-detail-view';

type MainView = 'general' | 'personal';
type GeneralTab = 'integrantes' | 'cronograma' | 'pagos' | 'turnos';

function JuntaScoreBadge({ score }: { score: number }) {
  return <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Score {score}</span>;
}

function statusClass(status: string) {
  if (status === 'Pagado' || status === 'Entregado') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Validando' || status === 'En curso') return 'bg-blue-100 text-blue-700';
  if (status === 'Recibe') return 'bg-violet-100 text-violet-700';
  if (status === 'Vencido' || status === 'Rechazado') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
}

function JuntaPaymentStatusRow({ row, showPayAction, onPay }: { row: WeeklyMemberRow; showPayAction?: boolean; onPay?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(row.displayName)}`}>{getInitial(row.displayName)}</div>
        <div>
          <p className="text-sm font-medium">{row.displayName}</p>
          <p className="text-xs text-slate-500">Turno #{row.turno} · S/{row.amount.toFixed(0)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <JuntaScoreBadge score={row.score} />
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(row.status)}`}>{row.status}</span>
        {showPayAction && row.isCurrentUser && row.status !== 'Pagado' && row.status !== 'Recibe' && (
          <Button onClick={onPay}>Pagar S/{row.amount.toFixed(0)} →</Button>
        )}
      </div>
    </div>
  );
}

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { juntas, members, payments, schedules, setData } = useAppStore();

  const [mainView, setMainView] = useState<MainView>('general');
  const [generalTab, setGeneralTab] = useState<GeneralTab>('integrantes');
  const [loadingJunta, setLoadingJunta] = useState(true);
  const [junta, setJunta] = useState<Junta | null>(juntas.find((j) => j.id === params.id) ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'unauthorized' | 'blocked' | 'not_found'>('checking');
  const [phaseTwoLoading, setPhaseTwoLoading] = useState(false);
  const [detailMembers, setDetailMembers] = useState<typeof members>([]);
  const [detailPayments, setDetailPayments] = useState<typeof payments>([]);
  const [detailSchedules, setDetailSchedules] = useState<typeof schedules>([]);
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null);
  const [manualTurns, setManualTurns] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoadingJunta(false);
        setAccessState('unauthorized');
        return;
      }

      setLoadError(null);
      setAccessState('checking');

      try {
        const storedJunta = juntas.find((j) => j.id === params.id) ?? null;
        const [detailResult, membersResult, membershipResult] = await Promise.all([
          storedJunta ? Promise.resolve({ ok: true as const, data: storedJunta }) : fetchJuntaById(params.id),
          fetchMembersByJuntaIds([params.id]),
          fetchMyActiveMembership({ juntaId: params.id, profileId: user.id })
        ]);

        let resolvedJunta = detailResult.ok ? detailResult.data : null;
        const activeMembers = membersResult.ok ? membersResult.data.filter((member) => member.estado === 'activo') : [];
        if (membersResult.ok) setData({ members: membersResult.data });

        if (!resolvedJunta) {
          // Fallback only when direct detail fetch fails; keep it as last attempt to avoid heavy catalog queries on happy path.
          const catalogResult = await fetchAvailableJuntas(user.id);
          if (catalogResult.ok) {
            resolvedJunta = catalogResult.data.find((item) => item.id === params.id) ?? null;
          }
        }

        if (!resolvedJunta) {
          setAccessState('not_found');
          return;
        }

        setJunta(resolvedJunta);

        const isCreator = resolvedJunta.admin_id === user.id;
        const isActiveMember = membershipResult.ok
          ? membershipResult.isActiveMember
          : activeMembers.some((member) => member.profile_id === user.id);
        const hasAccess = isCreator || isActiveMember;
        if (!hasAccess) {
          setAccessState('unauthorized');
          return;
        }

        if (isJuntaBlockedByDeadline(resolvedJunta)) {
          setAccessState('blocked');
          return;
        }

        setAccessState('allowed');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la junta.');
      } finally {
        setLoadingJunta(false);
      }
    };
    load();
  }, [juntas, params.id, setData, user, user?.id]);

  useEffect(() => {
    if (accessState !== 'allowed' || !junta) return;
    setPhaseTwoLoading(true);
    setDetailMembers(members.filter((member) => member.junta_id === junta.id && member.estado === 'activo'));
    setDetailPayments(payments.filter((payment) => payment.junta_id === junta.id));
    setDetailSchedules(schedules.filter((schedule) => schedule.junta_id === junta.id));
    setPhaseTwoLoading(false);
  }, [accessState, junta, members, payments, schedules]);

  const juntaMembers = useMemo(() => {
    if (!junta) return detailMembers;
    return getActiveMembersForJunta(junta, detailMembers);
  }, [detailMembers, junta]);
  const currentUserName = useMemo(() => user?.nombre?.split(' ')[0] ?? 'Tú', [user?.nombre]);

  const simulation = useMemo(() => {
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

  const refreshSnapshot = async () => {
    if (!user?.id) return;
    const result = await fetchUserJuntaSnapshot(user.id);
    if (!result.ok) return;
    setData({
      juntas: result.data.juntas,
      members: result.data.members,
      schedules: result.data.schedules,
      payments: result.data.payments,
      payouts: result.data.payouts
    });

    const refreshedJunta = result.data.juntas.find((item) => item.id === params.id) ?? null;
    if (refreshedJunta) setJunta(refreshedJunta);
    setDetailMembers(result.data.members.filter((member) => member.junta_id === params.id && member.estado === 'activo'));
    setDetailPayments(result.data.payments.filter((payment) => payment.junta_id === params.id));
    setDetailSchedules(result.data.schedules.filter((schedule) => schedule.junta_id === params.id));
  };

  if (loadingJunta) return <Card>Cargando junta...</Card>;
  if (loadError) return <Card><p className="text-sm text-red-600">No pudimos cargar la junta: {loadError}</p></Card>;
  if (accessState === 'unauthorized') return <Card><p className="text-sm text-slate-600">No tienes permisos para ver esta junta.</p></Card>;
  if (accessState === 'blocked') return <Card><p className="text-sm text-slate-600">Esta junta no está disponible temporalmente.</p></Card>;
  if (accessState === 'not_found') return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;
  if (!junta || !simulation) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  const juntaActiva = isJuntaActive(junta.estado);
  const blockedByDeadline = isJuntaBlockedByDeadline(junta);
  const currentWeek = Math.max(1, Math.min(simulation.rows.length, Math.max(juntaMembers.length, 1)));
  const summary = getCurrentWeekSummary({
    junta,
    members: juntaMembers,
    payments: detailPayments,
    schedules: detailSchedules,
    currentWeek,
    userId: user?.id,
    juntaActiva
  });
  const paidParticipants = getPaidParticipants(summary.rows);
  const pendingPayers = getPendingPayers(summary.rows);
  const needsScheduleRows = (mainView === 'general' && (generalTab === 'cronograma' || generalTab === 'turnos')) || mainView === 'personal';
  const scheduleRows = needsScheduleRows
    ? getTurnSchedule({
      rows: simulation.rows.map((row) => ({ ...row })),
      currentWeek,
      receiverTurn: juntaMembers.find((member) => member.profile_id === user?.id)?.orden_turno ?? null
    })
    : [];
  const personal = getUserPersonalJuntaView({
    junta,
    currentWeek,
    weeklyRows: summary.rows,
    myTurn: juntaMembers.find((member) => member.profile_id === user?.id)?.orden_turno ?? null,
    simulationRows: simulation.rows.map((row) => ({ ...row }))
  });

  const incentiveLabel = formatIncentiveLabel({
    tipoJunta: junta.tipo_junta,
    incentivoPorcentaje: junta.incentivo_porcentaje,
    incentivoRegla: junta.incentivo_regla
  });

  const canOperateTurns = !juntaActiva && junta.turn_assignment_mode === 'manual' && !blockedByDeadline;

  const headerSubtitle = `Semana ${currentWeek} · ${junta.frecuencia_pago} · ${junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}`;

  return (
    <div className="space-y-4 pb-6">
      <Card className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
            <p className="text-sm text-slate-500">{headerSubtitle}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{juntaActiva ? 'Activa' : 'En formación'}</Badge>
              {blockedByDeadline && <Badge>Bloqueada</Badge>}
              <Badge>{junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</Badge>
              <Badge>{juntaMembers.length}/{junta.participantes_max} integrantes</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const shareUrl = `${window.location.origin}/junta/${junta.slug}`;
                try { navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
              }}
            >
              Copiar enlace
            </Button>
            <Button variant="ghost">Opciones</Button>
          </div>
        </div>

        <div className="flex w-full rounded-xl bg-slate-100 p-1 text-sm">
          <button type="button" className={`flex-1 rounded-lg px-3 py-2 ${mainView === 'general' ? 'bg-white font-semibold text-slate-900 shadow' : 'text-slate-600'}`} onClick={() => setMainView('general')}>Vista general</button>
          <button type="button" className={`flex-1 rounded-lg px-3 py-2 ${mainView === 'personal' ? 'bg-white font-semibold text-slate-900 shadow' : 'text-slate-600'}`} onClick={() => setMainView('personal')}>Mi vista ({currentUserName})</button>
        </div>
      </Card>

      {mainView === 'general' && (
        <div className="space-y-4">
          {phaseTwoLoading && <Card className="p-3 text-sm text-slate-500">Cargando pagos, cronograma e integrantes…</Card>}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="p-3"><p className="text-xs text-slate-500">Bolsa semana</p><p className="text-2xl font-semibold">S/{((junta.cuota_base ?? junta.monto_cuota) * juntaMembers.length).toFixed(0)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Pagos esta semana</p><p className="text-2xl font-semibold">{summary.paid}/{summary.rows.length}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Turno actual</p><p className="text-2xl font-semibold">#{currentWeek}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Pendientes</p><p className="text-2xl font-semibold">{summary.pending}</p></Card>
          </div>

          <Card className="space-y-2 p-3">
            <div className="flex items-center justify-between text-sm text-slate-600"><span>Progreso del ciclo</span><span>Semana {currentWeek}/{simulation.rows.length}</span></div>
            <div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${(currentWeek / Math.max(simulation.rows.length, 1)) * 100}%` }} /></div>
          </Card>

          <div className="flex flex-wrap gap-2">
            {([
              ['integrantes', 'Integrantes'],
              ['cronograma', 'Cronograma'],
              ['pagos', 'Pagos'],
              ['turnos', 'Asignar turnos']
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setGeneralTab(id)} className={`rounded-full px-3 py-1.5 text-sm ${generalTab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {generalTab === 'integrantes' && (
            <Card className="space-y-3 p-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Esta semana recibe {summary.receiver?.displayName ?? '—'} (turno #{currentWeek}). Faltan {summary.pending} pagos para liberar la bolsa.
              </div>

              <div className="rounded-xl border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Receptor actual</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${getAvatarColor(summary.receiver?.displayName ?? 'Receptor')}`}>{getInitial(summary.receiver?.displayName ?? 'R')}</div>
                    <div>
                      <p className="font-semibold">{summary.receiver?.displayName ?? 'Pendiente'}</p>
                      <p className="text-sm text-slate-500">Turno #{currentWeek} · recibe esta semana</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <JuntaScoreBadge score={summary.rows.find((row) => row.isReceiver)?.score ?? 70} />
                    <Badge>{summary.pending === 0 ? 'Listo para confirmar' : 'Esperando pagos'}</Badge>
                    {summary.pending === 0 && <Button variant="outline">Confirmar recibo</Button>}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="space-y-2 p-3">
                  <p className="text-sm font-medium">Pagaron esta semana ({paidParticipants.length}/{summary.rows.length})</p>
                  {paidParticipants.map((row) => <JuntaPaymentStatusRow key={row.id} row={row} />)}
                </Card>
                <Card className="space-y-2 p-3">
                  <p className="text-sm font-medium">Pendientes ({pendingPayers.length}/{summary.rows.length})</p>
                  {pendingPayers.map((row) => (
                    <div key={row.id} className="space-y-2">
                      <JuntaPaymentStatusRow row={row} />
                      <div className="flex gap-2 pl-2"><Button variant="ghost">Reenviar recordatorio</Button><Button variant="ghost">WhatsApp</Button></div>
                    </div>
                  ))}
                </Card>
              </div>
            </Card>
          )}

          {generalTab === 'cronograma' && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Turno</th><th className="px-3 py-2 text-left">Participante</th><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Recibe</th><th className="px-3 py-2 text-left">Estado</th></tr></thead>
                <tbody>
                  {scheduleRows.map((row) => (
                    <tr key={row.turno} className={`border-t ${row.isCurrentWeek ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-2">#{row.turno}</td>
                      <td className="px-3 py-2">{row.isUserTurn ? 'Tú' : `Integrante ${row.turno}`}</td>
                      <td className="px-3 py-2">{row.fechaRonda}</td>
                      <td className="px-3 py-2">S/{row.montoRecibido.toFixed(2)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(row.weekStatus)}`}>{row.weekStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-xs text-slate-500">{junta.tipo_junta === 'incentivo' ? `Incentivos aplicados: ${incentiveLabel}` : 'Junta normal sin incentivos.'}</p>
            </Card>
          )}

          {generalTab === 'pagos' && (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Semana {currentWeek} — {summary.receiver?.displayName ?? 'Receptor'} recibe</h3>
                <Badge>En curso</Badge>
              </div>
              <div className="space-y-2">
                {summary.rows.map((row) => (
                  <JuntaPaymentStatusRow key={row.id} row={row} showPayAction onPay={() => router.push(`/juntas/${junta.id}/registrar-pago`)} />
                ))}
              </div>
            </Card>
          )}

          {generalTab === 'turnos' && (
            <Card className="space-y-3 p-4">
              <p className="text-sm text-slate-600">Este modo solo está disponible antes de activar la junta. Arrastra o selecciona el turno de cada participante manualmente.</p>
              {juntaActiva || blockedByDeadline ? (
                <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-600">
                  {blockedByDeadline
                    ? 'La junta está bloqueada por vencimiento y los turnos quedan en modo solo lectura.'
                    : 'La junta ya está activa. Los turnos están en modo solo lectura.'}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {juntaMembers.map((member, index) => (
                      <div key={member.id} className="flex items-center justify-between rounded-md border p-2">
                        <p className="text-sm">{member.profile_id === user?.id ? 'Tú' : member.profile_id === junta.admin_id ? 'Creador' : `Integrante ${index + 1}`}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Turno</span>
                          <select
                            className="rounded-md border px-2 py-1 text-sm"
                            value={manualTurns[member.profile_id] ?? member.orden_turno}
                            onChange={(event) => setManualTurns((prev) => ({ ...prev, [member.profile_id]: Number(event.target.value) }))}
                            disabled={!canOperateTurns}
                          >
                            {Array.from({ length: juntaMembers.length }).map((_, turnIdx) => <option key={turnIdx + 1} value={turnIdx + 1}>{turnIdx + 1}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!canOperateTurns}
                      onClick={() => {
                        const shuffled = [...juntaMembers].sort(() => Math.random() - 0.5);
                        const next: Record<string, number> = {};
                        shuffled.forEach((member, idx) => { next[member.profile_id] = idx + 1; });
                        setManualTurns(next);
                        setPaymentInfo(null);
                      }}
                    >
                      Sortear aleatoriamente
                    </Button>
                    <Button
                      disabled={juntaMembers.length < junta.participantes_max}
                      onClick={async () => {
                        if (canOperateTurns) {
                          const assignedTurns = juntaMembers.map((member) => manualTurns[member.profile_id] ?? member.orden_turno);
                          const uniqueTurns = new Set(assignedTurns);
                          if (uniqueTurns.size !== juntaMembers.length) {
                            setPaymentInfo('No puedes repetir turnos. Asigna un turno único por integrante.');
                            return;
                          }

                          const turnsByProfileId = juntaMembers.reduce<Record<string, number>>((acc, member) => {
                            acc[member.profile_id] = manualTurns[member.profile_id] ?? member.orden_turno;
                            return acc;
                          }, {});

                          const saveTurnsResult = await updateJuntaMemberTurns({ juntaId: junta.id, turnsByProfileId });
                          if (!saveTurnsResult.ok) {
                            setPaymentInfo(saveTurnsResult.message);
                            return;
                          }
                        }

                        const result = await activateJuntaIfReady({ juntaId: junta.id });
                        if (!result.ok) {
                          setPaymentInfo(result.message);
                          return;
                        }

                        await refreshSnapshot();
                        setPaymentInfo(null);
                      }}
                    >
                      Activar junta
                    </Button>
                  </div>
                </>
              )}
              {paymentInfo && <p className="text-xs text-rose-700">{paymentInfo}</p>}
              {blockedByDeadline && (
                <p className="text-xs text-rose-700">Bloqueada por no activarse antes de la fecha del primer pago ({APP_BUSINESS_TIMEZONE}).</p>
              )}
            </Card>
          )}
        </div>
      )}

      {mainView === 'personal' && (
        <div className="space-y-4">
          <Card className="space-y-3 border-0 bg-slate-900 p-5 text-white">
            <p className="text-xs uppercase tracking-wide text-slate-300">Tu turno</p>
            <p className="text-5xl font-bold">#{personal.myTurnRow?.turno ?? '-'}</p>
            <p className="text-sm text-slate-200">{junta.nombre} · Recibes S/{(personal.myTurnRow?.montoRecibido ?? simulation.bolsaBase).toFixed(2)}</p>
            <p className="text-sm text-slate-300">Fecha estimada: {personal.myTurnRow?.fechaRonda ?? 'Pendiente'} · {personal.myTurnRow ? `en ${Math.max(personal.myTurnRow.turno - currentWeek, 0)} semanas` : 'sin turno asignado'}</p>
            <div className="flex items-center gap-2"><JuntaScoreBadge score={personal.myRow?.score ?? 70} /><span className="text-xs text-slate-300">Confianza visible para el grupo</span></div>
          </Card>

          {personal.myRow && personal.myRow.status !== 'Pagado' && personal.myRow.status !== 'Recibe' && (
            <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Esta semana debes pagar S/{personal.myRow.amount.toFixed(2)}{junta.tipo_junta === 'incentivo' ? ' (incluye ajustes por incentivos).' : '.'}
            </Card>
          )}

          <Card className="space-y-3 p-4">
            <h3 className="text-lg font-semibold">Esta semana · turno de {summary.receiver?.displayName ?? '—'}</h3>
            <p className="text-4xl font-bold">S/{(personal.myRow?.amount ?? (junta.cuota_base ?? junta.monto_cuota)).toFixed(2)}</p>
            <div className="text-sm text-slate-600">
              <p>Base: S/{(junta.cuota_base ?? junta.monto_cuota).toFixed(2)}</p>
              <p>Ajuste: {junta.tipo_junta === 'incentivo' ? incentiveLabel : 'No aplica'}</p>
              <p>{personal.progressLabel}</p>
            </div>
            <Button onClick={() => router.push(`/juntas/${junta.id}/registrar-pago`)}>Pagar ahora →</Button>
            {paymentInfo && <p className="text-xs text-amber-700">{paymentInfo}</p>}
          </Card>

          <Card className="space-y-2 p-4">
            <h4 className="text-sm font-semibold">Estado del grupo esta semana</h4>
            {summary.rows.slice(0, 4).map((row) => <JuntaPaymentStatusRow key={row.id} row={row} />)}
            <p className="text-xs text-slate-500">{summary.paid} pagaron de {summary.rows.length}</p>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 text-left">Semana</th><th className="px-3 py-2 text-left">Fecha</th><th className="px-3 py-2 text-left">Recibe</th><th className="px-3 py-2 text-left">Tu aporte</th><th className="px-3 py-2 text-left">Estado</th></tr></thead>
              <tbody>
                {scheduleRows.map((row) => {
                  const isCurrent = row.turno === currentWeek;
                  const isMine = row.isUserTurn;
                  const status = row.turno < currentWeek ? 'Pagado' : isCurrent ? 'Pagar' : isMine ? 'Tu turno' : 'Por venir';
                  return (
                    <tr key={row.turno} className="border-t">
                      <td className="px-3 py-2">Semana {row.turno}</td>
                      <td className="px-3 py-2">{row.fechaRonda}</td>
                      <td className="px-3 py-2">{isMine ? 'Tú' : `Integrante ${row.turno}`}</td>
                      <td className="px-3 py-2">S/{row.cuotaPorRonda.toFixed(2)}</td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(status)}`}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
