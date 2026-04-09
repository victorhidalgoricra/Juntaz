'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';
import { formatIncentiveLabel, getAvatarColor, getInitial } from '@/lib/profile-display';

type DetailTab = 'integrantes' | 'cronograma' | 'pagos';

function CronogramaView({
  rows,
  currentWeek,
  myTurn
}: {
  rows: ReturnType<typeof calcularSimulacionJunta>['rows'];
  currentWeek: number;
  myTurn: number | null;
}) {
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Cronograma</h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const status = row.turno === myTurn ? 'Tu turno' : row.turno < currentWeek ? 'Pagado' : row.turno === currentWeek ? 'Pendiente' : 'Por venir';
          return (
            <div key={`tab-schedule-${row.turno}`} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <p>Semana {row.turno} · {row.fechaRonda}</p>
              <div className="flex items-center gap-2">
                <Badge>{status}</Badge>
                <span>S/ {row.cuotaPorRonda.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function IntegrantesView({
  members,
  juntaAdminId,
  currentUserId,
  currentWeek
}: {
  members: Array<{ id: string; profile_id: string; orden_turno: number; rol?: 'admin' | 'participante' }>;
  juntaAdminId: string;
  currentUserId?: string;
  currentWeek: number;
}) {
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Integrantes</h2>
      <div className="space-y-2">
        {members.map((member, index) => {
          const isSelf = member.profile_id === currentUserId;
          const displayName = member.profile_id === juntaAdminId ? 'Creador' : isSelf ? 'Tú' : `Integrante ${index + 1}`;
          const paymentStatus = member.orden_turno < currentWeek ? 'Pagado' : member.orden_turno === currentWeek ? 'Pendiente' : 'Por venir';
          return (
            <div key={`tab-member-${member.id}`} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(displayName)}`}>{getInitial(displayName)}</div>
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-slate-500">Turno {member.orden_turno} · {member.rol ?? 'participante'}</p>
                </div>
              </div>
              <Badge>{paymentStatus}</Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PagosView({
  rows,
  currentWeek,
  myTurn
}: {
  rows: ReturnType<typeof calcularSimulacionJunta>['rows'];
  currentWeek: number;
  myTurn: number | null;
}) {
  return (
    <Card>
      <h2 className="mb-2 font-semibold">Pagos</h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const status = row.turno < currentWeek ? 'pagado' : row.turno === currentWeek ? 'pendiente' : 'pendiente';
          const isMine = row.turno === myTurn;
          return (
            <div key={`tab-payment-${row.turno}`} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div>
                <p className="font-medium">Turno #{row.turno}{isMine ? ' · Tu turno' : ''}</p>
                <p className="text-xs text-slate-500">{row.fechaRonda}</p>
              </div>
              <div className="text-right">
                <p>S/ {row.cuotaPorRonda.toFixed(2)}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, members, setData } = useAppStore();
  const storeJunta = juntas.find((j) => j.id === params.id) ?? null;
  const [junta, setJunta] = useState<Junta | null>(storeJunta);
  const [loadingJunta, setLoadingJunta] = useState(!storeJunta);
  const [activeView, setActiveView] = useState<'general' | 'participante'>('general');
  const [activeTab, setActiveTab] = useState<DetailTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'integrantes' || tabParam === 'cronograma' || tabParam === 'pagos') return tabParam;
    return 'cronograma';
  });

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
      incentivoRegla: junta.incentivo_regla ?? 'primero_ultimo'
    });
  }, [junta]);

  const shareUrl = junta
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/junta/${junta.slug}`
      : `/junta/${junta.slug}`
    : '';

  if (loadingJunta) return <Card>Cargando junta...</Card>;
  if (!junta || !simulacion) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  const faltantes = Math.max(junta.participantes_max - miembrosActuales, 0);
  const progreso = Math.min((miembrosActuales / junta.participantes_max) * 100, 100);
  const activable = miembrosActuales >= junta.participantes_max;
  const isCreator = user?.id === junta.admin_id;
  const isCurrentUserMember = miembrosActivos.some((member) => member.profile_id === user?.id);
  const isPrivateUnauthorized = junta.visibilidad === 'privada' && !isCreator && !isCurrentUserMember;
  const incentiveLabel = formatIncentiveLabel({
    tipoJunta: junta.tipo_junta,
    incentivoPorcentaje: junta.incentivo_porcentaje,
    incentivoRegla: junta.incentivo_regla
  });
  const currentWeek = Math.max(1, Math.min(simulacion.rows.length, miembrosActuales));
  const myMember = miembrosActivos.find((member) => member.profile_id === user?.id) ?? null;
  const myTurn = myMember?.orden_turno ?? null;
  const myTurnRow = myTurn ? simulacion.rows.find((row) => row.turno === myTurn) ?? null : null;
  const pendingBanner = Boolean(myMember) && (myTurn ?? 0) >= currentWeek;

  if (isPrivateUnauthorized) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
        <p className="text-sm text-slate-600">Esta junta privada requiere enlace o código válido para acceder.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.replace('/juntas')}>Volver a juntas</Button>
          <Button onClick={() => router.replace('/juntas')}>Acceder con código</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
          <p className="text-xs text-slate-600">Semana {currentWeek}/{junta.participantes_max}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeView === 'general' ? 'default' : 'outline'} onClick={() => setActiveView('general')}>Vista general</Button>
          {isCurrentUserMember && (
            <Button variant={activeView === 'participante' ? 'default' : 'outline'} onClick={() => setActiveView('participante')}>Vista participante</Button>
          )}
        </div>
      </Card>

      {activeView === 'participante' && isCurrentUserMember && pendingBanner && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800">Tienes una acción pendiente.</p>
          <p className="text-xs text-amber-700">Tienes hasta hoy 12:00pm para pagar S/ {(junta.cuota_base ?? junta.monto_cuota).toFixed(2)}.</p>
        </Card>
      )}

      {activeView === 'general' && (
        <>
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <Badge>{junta.estado}</Badge>
                  <Badge>{junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</Badge>
                  <Badge>{junta.visibilidad}</Badge>
                  <span className="rounded-full bg-slate-100 px-2 py-1 font-medium">Integrantes {miembrosActuales}/{junta.participantes_max}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(shareUrl); alert('Enlace copiado'); } catch { alert(shareUrl); } }}>Copiar enlace</Button>
                {junta.visibilidad === 'privada' && junta.access_code && (
                  <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(junta.access_code ?? ''); alert('Código copiado'); } catch { alert(junta.access_code); } }}>Copiar código</Button>
                )}
                {isCreator && (
                  <>
                    <Button
                      variant="ghost"
                      disabled={!activable}
                      title={activable ? 'Lista para activar' : 'Completa todos los integrantes para activar la junta'}
                      onClick={async () => {
                        const result = await activateJuntaIfReady({ juntaId: junta.id });
                        if (!result.ok) {
                          alert(result.message);
                          return;
                        }

                        const nextJunta = { ...junta, ...result.data };
                        setJunta(nextJunta);
                        setData({ juntas: juntas.map((j) => (j.id === junta.id ? nextJunta : j)) });
                      }}
                    >
                      Activar junta
                    </Button>
                    {junta.estado !== 'activa' && (
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (!junta.id) {
                            alert('No pudimos eliminar la junta. Intenta nuevamente.');
                            return;
                          }

                          const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta junta? Esta acción no se puede deshacer.');
                          if (!confirmDelete || !user) return;
                          const currentProfileId = user.id;
                          if (!currentProfileId) {
                            alert('No pudimos validar tu perfil. Vuelve a iniciar sesión.');
                            return;
                          }

                          const result = await deleteDraftJunta({ juntaId: junta.id, currentProfileId });
                          if (!result.ok) {
                            alert(result.message);
                            return;
                          }

                          setData({
                            juntas: juntas.filter((j) => j.id !== junta.id),
                            members: members.filter((m) => m.junta_id !== junta.id)
                          });
                          alert('Junta eliminada correctamente.');
                          router.replace('/juntas');
                        }}
                      >
                        Eliminar junta
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {!activable && <p className="text-xs text-amber-700">Completa todos los integrantes para activar la junta.</p>}
          </Card>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card><p className="text-xs text-slate-500">Bolsa semanal</p><p className="text-2xl font-bold">S/ {simulacion.bolsaBase.toFixed(2)}</p></Card>
            <Card><p className="text-xs text-slate-500">Cuota base</p><p className="text-2xl font-bold">S/ {simulacion.cuotaBase.toFixed(2)}</p></Card>
            <Card><p className="text-xs text-slate-500">Incentivo</p><p className="text-sm font-semibold">{incentiveLabel}</p></Card>
            <Card className="space-y-2">
              <p className="text-xs text-slate-500">Integrantes</p>
              <p className="text-2xl font-bold">{miembrosActuales}/{junta.participantes_max}</p>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-xs text-slate-600">{faltantes === 0 ? 'Junta completa' : `Faltan ${faltantes} integrantes`}</p>
            </Card>
          </div>

          <Card>
            <h2 className="mb-2 font-semibold">Integrantes de la semana actual</h2>
            {miembrosNormalizados.length === 0 ? (
              <p className="text-sm text-slate-600">Aún no hay integrantes registrados.</p>
            ) : (
              <div className="space-y-2">
                {miembrosNormalizados.map((member, index) => {
                  const isSelf = member.profile_id === user?.id;
                  const displayName = member.profile_id === junta.admin_id ? 'Creador' : isSelf ? 'Tú' : `Integrante ${index + 1}`;
                  const paymentStatus = member.orden_turno < currentWeek ? 'Pagado' : member.orden_turno === currentWeek ? 'Pendiente' : 'Por venir';
                  return (
                    <div key={member.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColor(displayName)}`}>{getInitial(displayName)}</div>
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-xs text-slate-500">Turno {member.orden_turno} · {member.rol ?? 'participante'}</p>
                        </div>
                      </div>
                      <Badge>{paymentStatus}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Cronograma y simulación</h2>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2">Turno</th>
                    <th>Fecha ronda</th>
                    <th>Cuota/ronda</th>
                    <th>Estado</th>
                    <th>Total aportado ciclo</th>
                    <th>Monto recibido</th>
                    <th>Ajuste</th>
                    <th>Beneficio/Costo neto</th>
                  </tr>
                </thead>
                <tbody>
                  {simulacion.rows.map((row) => {
                    const status = row.turno === myTurn ? 'Tu turno' : row.turno < currentWeek ? 'Pagado' : row.turno === currentWeek ? 'Pendiente' : 'Por venir';
                    return (
                      <tr key={row.turno} className="border-b">
                        <td className="py-2">#{row.turno}</td>
                        <td>{row.fechaRonda}</td>
                        <td>S/ {row.cuotaPorRonda.toFixed(2)}</td>
                        <td>{status}</td>
                        <td>S/ {row.totalAportadoCiclo.toFixed(2)}</td>
                        <td>S/ {row.montoRecibido.toFixed(2)}</td>
                        <td className={row.ajuste >= 0 ? 'text-emerald-700' : 'text-amber-700'}>{row.ajuste >= 0 ? '+' : ''}S/ {row.ajuste.toFixed(2)}</td>
                        <td className={row.neto >= 0 ? 'text-emerald-700' : 'text-amber-700'}>{row.neto >= 0 ? '+' : ''}S/ {row.neto.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeView === 'participante' && isCurrentUserMember && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="space-y-2">
              <p className="text-xs text-slate-500">Tu turno</p>
              <p className="text-2xl font-bold">#{myTurn ?? '-'}</p>
              <p className="text-sm text-slate-600">{myTurnRow ? `Semana ${myTurnRow.turno} · ${myTurnRow.fechaRonda}` : 'Turno por definir'}</p>
              <p className="text-sm text-slate-700">Recibirás S/ {myTurnRow ? myTurnRow.montoRecibido.toFixed(2) : '0.00'}</p>
              <p className="text-sm text-slate-700">Aporte esta semana S/ {(junta.cuota_base ?? junta.monto_cuota).toFixed(2)}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs text-slate-500">Score de confianza</p>
              <p className="text-2xl font-bold">{Math.max(60, 100 - (currentWeek > (myTurn ?? currentWeek) ? 5 : 0))}/100</p>
              <p className="text-xs text-slate-600">Pagos a tiempo: {Math.max(currentWeek - 1, 0)}</p>
              <p className="text-xs text-slate-600">Fondo de garantía: S/ {((junta.cuota_base ?? junta.monto_cuota) * 0.1).toFixed(2)}</p>
            </Card>
          </div>

          <Card>
            <h2 className="mb-2 font-semibold">Cronograma del participante</h2>
            <div className="space-y-2">
              {simulacion.rows.map((row) => {
                const status = row.turno === myTurn ? 'Tu turno' : row.turno < currentWeek ? 'Pagado' : row.turno === currentWeek ? 'Pendiente' : 'Por venir';
                return (
                  <div key={`participant-${row.turno}`} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <p>Semana {row.turno} · {row.fechaRonda}</p>
                    <div className="flex items-center gap-2">
                      <Badge>{status}</Badge>
                      <span>S/ {row.cuotaPorRonda.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('integrantes');
              router.replace(`/juntas/${junta.id}?tab=integrantes`);
            }}
            className={`rounded-md px-3 py-2 text-sm transition ${activeTab === 'integrantes' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Integrantes
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('cronograma');
              router.replace(`/juntas/${junta.id}?tab=cronograma`);
            }}
            className={`rounded-md px-3 py-2 text-sm transition ${activeTab === 'cronograma' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Cronograma
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pagos');
              router.replace(`/juntas/${junta.id}?tab=pagos`);
            }}
            className={`rounded-md px-3 py-2 text-sm transition ${activeTab === 'pagos' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Pagos
          </button>
        </div>

        {activeTab === 'integrantes' && (
          <IntegrantesView members={miembrosNormalizados} juntaAdminId={junta.admin_id} currentUserId={user?.id} currentWeek={currentWeek} />
        )}
        {activeTab === 'cronograma' && (
          <CronogramaView rows={simulacion.rows} currentWeek={currentWeek} myTurn={myTurn} />
        )}
        {activeTab === 'pagos' && (
          <PagosView rows={simulacion.rows} currentWeek={currentWeek} myTurn={myTurn} />
        )}
      </div>
    </div>
  );
}
