'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { validarActivacionJunta } from '@/services/junta.service';
import { fetchJuntaById } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const { juntas, members, setData } = useAppStore();
  const storeJunta = juntas.find((j) => j.id === params.id) ?? null;
  const [junta, setJunta] = useState<Junta | null>(storeJunta);
  const [loadingJunta, setLoadingJunta] = useState(!storeJunta);

  const [groupSize, setGroupSize] = useState(0);
  const [aporte, setAporte] = useState(0);
  const [premioPrimero, setPremioPrimero] = useState(3);
  const [descuentoUltimo, setDescuentoUltimo] = useState(3);
  const [feePct, setFeePct] = useState(2);

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

  useEffect(() => {
    if (!junta) return;
    setGroupSize(junta.participantes_max);
    setAporte(junta.monto_cuota);
    setPremioPrimero(junta.premio_primero_pct ?? 3);
    setDescuentoUltimo(junta.descuento_ultimo_pct ?? 3);
    setFeePct(junta.fee_plataforma_pct ?? 2);
  }, [junta]);

  const miembros = junta ? members.filter((m) => m.junta_id === junta.id) : [];
  const bolsaSemanal = groupSize * aporte;
  const feeCiclo = (bolsaSemanal * feePct * groupSize) / 100;
  const ingresoCiclo = bolsaSemanal * groupSize - feeCiclo;

  const rows = useMemo(
    () =>
      Array.from({ length: Math.max(groupSize, 0) }).map((_, index) => {
        const turn = index + 1;
        const extra =
          turn === 1
            ? (bolsaSemanal * premioPrimero) / 100
            : turn === groupSize
              ? -(bolsaSemanal * descuentoUltimo) / 100
              : 0;

        const perfil = turn === 1 ? 'Necesita liquidez urgente' : turn === groupSize ? 'Busca descuento' : 'Flexible';

        return { turn, week: turn, aporteTotal: bolsaSemanal, recibe: bolsaSemanal + extra, extra, perfil };
      }),
    [groupSize, bolsaSemanal, premioPrimero, descuentoUltimo]
  );

  const shareUrl = junta
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/junta/${junta.slug}`
      : `/junta/${junta.slug}`
    : '';

  if (loadingJunta) return <Card>Cargando junta...</Card>;
  if (!junta) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
            <p className="text-sm text-slate-500">Simulador y configuración de ciclo · Visibilidad: {junta.visibilidad}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{junta.estado}</Badge>
            <Button variant="outline" onClick={() => { try { navigator.clipboard.writeText(shareUrl); alert('Enlace copiado'); } catch { alert(shareUrl); } }}>Compartir enlace</Button>
            {junta.visibilidad === 'privada' && junta.access_code && (
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(junta.access_code ?? '');
                    alert('Código copiado');
                  } catch {
                    alert(junta.access_code);
                  }
                }}
              >
                Copiar código
              </Button>
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
            >Activar junta</Button>
          </div>
        </div>
      </Card>


      {junta.visibilidad === 'privada' && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Acceso privado</p>
          <p className="text-xs text-slate-500">Enlace de invitación: {shareUrl}</p>
          <p className="text-xs text-slate-500">Código de acceso: <span className="font-semibold text-slate-700">{junta.access_code ?? 'Sin código'}</span></p>
        </Card>
      )}

      {junta.visibilidad === 'publica' && (
        <Card className="space-y-2">
          <p className="text-sm font-medium">Junta pública</p>
          <p className="text-xs text-slate-500">Esta junta aparece en /explorar para nuevos participantes.</p>
          <Button variant="outline">Ver como usuario</Button>
        </Card>
      )}
      <Card className="space-y-3">
        <h2 className="font-semibold">Configuración financiera</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <Input type="number" value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value || 0))} placeholder="Tamaño grupo" />
          <Input type="number" value={aporte} onChange={(e) => setAporte(Number(e.target.value || 0))} placeholder="Aporte" />
          <Input type="number" value={premioPrimero} onChange={(e) => setPremioPrimero(Number(e.target.value || 0))} placeholder="Premio primero %" />
          <Input type="number" value={descuentoUltimo} onChange={(e) => setDescuentoUltimo(Number(e.target.value || 0))} placeholder="Descuento último %" />
          <Input type="number" value={feePct} onChange={(e) => setFeePct(Number(e.target.value || 0))} placeholder="Fee plataforma %" />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><p className="text-xs text-slate-500">Bolsa semanal bruta</p><p className="text-2xl font-bold">S/ {bolsaSemanal.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Fee plataforma/ciclo</p><p className="text-2xl font-bold">S/ {feeCiclo.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Ingreso por grupo/ciclo</p><p className="text-2xl font-bold">S/ {ingresoCiclo.toFixed(2)}</p></Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Tabla de turnos</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b text-left text-slate-500"><th className="py-2">Turno</th><th>Semana</th><th>Aporte total/semana</th><th>Recibe (S/)</th><th>Aporte extra/descuento</th><th>Perfil ideal</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.turn} className="border-b"><td className="py-2">#{row.turn}</td><td>{row.week}</td><td>S/ {row.aporteTotal.toFixed(2)}</td><td>S/ {row.recibe.toFixed(2)}</td><td className={row.extra >= 0 ? 'text-blue-700' : 'text-red-600'}>{row.extra >= 0 ? '+' : ''}S/ {row.extra.toFixed(2)}</td><td>{row.perfil}</td></tr>
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
