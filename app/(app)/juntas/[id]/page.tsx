'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { validarActivacionJunta } from '@/services/junta.service';
import { fetchJuntaById } from '@/services/juntas.repository';
import { calcularSimulacionJunta } from '@/services/incentive.service';
import { Junta } from '@/types/domain';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const { juntas, members, setData } = useAppStore();
  const storeJunta = juntas.find((j) => j.id === params.id) ?? null;
  const [junta, setJunta] = useState<Junta | null>(storeJunta);
  const [loadingJunta, setLoadingJunta] = useState(!storeJunta);

  useEffect(() => {
    const load = async () => {
      if (storeJunta) {
        setJunta(storeJunta);
        setLoadingJunta(false);
        return;
      }
      setLoadingJunta(true);
      const result = await fetchJuntaById(params.id);
      if (result.ok && result.data) {
        setJunta(result.data);
        setData({ juntas: [result.data, ...juntas.filter((j) => j.id !== result.data!.id)] });
      }
      setLoadingJunta(false);
    };
    load();
  }, [storeJunta, params.id, setData, juntas]);

  const miembros = junta ? members.filter((m) => m.junta_id === junta.id) : [];

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

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
            <p className="text-sm text-slate-500">Simulación financiera sin retención de plataforma</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{junta.estado}</Badge>
            <Badge>{junta.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</Badge>
            <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(shareUrl); alert('Enlace copiado'); } catch { alert(shareUrl); } }}>Copiar enlace</Button>
            {junta.visibilidad === 'privada' && junta.access_code && (
              <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(junta.access_code ?? ''); alert('Código copiado'); } catch { alert(junta.access_code); } }}>Copiar código</Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                try {
                  validarActivacionJunta(miembros.length);
                  setData({ juntas: juntas.map((j) => (j.id === junta.id ? { ...j, estado: 'activa' } : j)) });
                } catch (error) {
                  alert((error as Error).message);
                }
              }}
            >
              Activar junta
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs text-slate-500">Bolsa base por ronda</p><p className="text-2xl font-bold">S/ {simulacion.bolsaBase.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Cuota base por ronda</p><p className="text-2xl font-bold">S/ {simulacion.cuotaBase.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Incentivo</p><p className="text-2xl font-bold">{simulacion.incentivoPorcentaje.toFixed(2)}%</p></Card>
        <Card><p className="text-xs text-slate-500">Plataforma</p><p className="text-2xl font-bold">No retiene</p></Card>
      </div>

      {junta.visibilidad === 'privada' ? (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Acceso privado</p>
          <p className="text-xs text-slate-500">Enlace: {shareUrl}</p>
          <p className="text-xs text-slate-500">Código: <span className="font-semibold text-slate-700">{junta.access_code ?? 'Sin código'}</span></p>
        </Card>
      ) : (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Junta pública</p>
          <p className="text-xs text-slate-500">Visible en el catálogo de Juntas disponibles.</p>
          <Button variant="outline">Ver como usuario</Button>
        </Card>
      )}

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

      <Card className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
        <p>Total aportado por el grupo: <span className="font-semibold text-slate-800">S/ {simulacion.totalAportes.toFixed(2)}</span></p>
        <p>Total recibido por el grupo: <span className="font-semibold text-slate-800">S/ {simulacion.totalRecibido.toFixed(2)}</span></p>
        <p>Balance neto del sistema: <span className="font-semibold text-slate-800">S/ {simulacion.balance.toFixed(2)}</span></p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button><Link href={`/juntas/${junta.id}/members`}>Integrantes</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/schedule`}>Cronograma</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/payments`}>Pagos</Link></Button>
      </div>
    </div>
  );
}
