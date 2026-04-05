'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { activateJuntaIfReady, deleteDraftJunta, fetchJuntaById, fetchMembersByJuntaIds } from '@/services/juntas.repository';
import { calcularSimulacionJunta } from '@/services/incentive.service';
import { Junta } from '@/types/domain';
import { hasSupabase } from '@/lib/env';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const { juntas, members, setData } = useAppStore();
  const storeJunta = juntas.find((j) => j.id === params.id) ?? null;
  const [junta, setJunta] = useState<Junta | null>(storeJunta);
  const [loadingJunta, setLoadingJunta] = useState(!storeJunta);

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

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
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
                      const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta junta? Esta acción no se puede deshacer.');
                      if (!confirmDelete || !user) return;

                      const result = await deleteDraftJunta({ juntaId: junta.id, userId: user.id });
                      if (!result.ok) {
                        alert(result.message);
                        return;
                      }

                      setData({
                        juntas: juntas.filter((j) => j.id !== junta.id),
                        members: members.filter((m) => m.junta_id !== junta.id)
                      });
                      alert('Junta eliminada correctamente.');
                      window.location.href = '/juntas';
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
        <Card><p className="text-xs text-slate-500">Bolsa base por ronda</p><p className="text-2xl font-bold">S/ {simulacion.bolsaBase.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Cuota base por ronda</p><p className="text-2xl font-bold">S/ {simulacion.cuotaBase.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Incentivo</p><p className="text-2xl font-bold">{simulacion.incentivoPorcentaje.toFixed(2)}%</p></Card>
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
        <h2 className="mb-2 font-semibold">Integrantes unidos</h2>
        {miembrosNormalizados.length === 0 ? (
          <p className="text-sm text-slate-600">Aún no hay integrantes registrados.</p>
        ) : (
          <div className="space-y-2">
            {miembrosNormalizados.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <p className="font-medium">{member.profile_id === junta.admin_id ? 'Creador (admin)' : member.profile_id}</p>
                <p className="text-slate-600">Rol: {member.rol ?? 'participante'} · Estado: {member.estado} · Turno: {member.orden_turno}</p>
              </div>
            ))}
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
                <th>Total aportado ciclo</th>
                <th>Monto recibido</th>
                <th>Ajuste</th>
                <th>Beneficio/Costo neto</th>
                <th>Perfil sugerido</th>
              </tr>
            </thead>
            <tbody>
              {simulacion.rows.map((row) => (
                <tr key={row.turno} className="border-b">
                  <td className="py-2">#{row.turno}</td>
                  <td>{row.fechaRonda}</td>
                  <td>S/ {row.cuotaPorRonda.toFixed(2)}</td>
                  <td>S/ {row.totalAportadoCiclo.toFixed(2)}</td>
                  <td>S/ {row.montoRecibido.toFixed(2)}</td>
                  <td className={row.ajuste >= 0 ? 'text-emerald-700' : 'text-amber-700'}>{row.ajuste >= 0 ? '+' : ''}S/ {row.ajuste.toFixed(2)}</td>
                  <td className={row.neto >= 0 ? 'text-emerald-700' : 'text-amber-700'}>{row.neto >= 0 ? '+' : ''}S/ {row.neto.toFixed(2)}</td>
                  <td>{row.perfil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button><Link href={`/juntas/${junta.id}/members`}>Integrantes</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/schedule`}>Cronograma</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/payments`}>Pagos</Link></Button>
      </div>
    </div>
  );
}
