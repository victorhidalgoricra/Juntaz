'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';

export default function AdminPage() {
  const { juntas, members, payments, setData } = useAppStore();
  const activas = juntas.filter((j) => j.estado === 'activa').length;
  const totalRecaudado = payments.filter((p) => p.estado === 'aprobado').reduce((acc, p) => acc + p.monto, 0);
  const morosos = members.filter((m) => m.estado === 'moroso').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backoffice Administrador</h1>
        <Link href="/dashboard"><Button variant="outline">Ir al producto</Button></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Card><p className="text-xs text-slate-500">Total usuarios</p><p className="text-2xl font-bold">{new Set(members.map((m) => m.profile_id)).size}</p></Card>
        <Card><p className="text-xs text-slate-500">Total juntas</p><p className="text-2xl font-bold">{juntas.length}</p></Card>
        <Card><p className="text-xs text-slate-500">Juntas activas</p><p className="text-2xl font-bold">{activas}</p></Card>
        <Card><p className="text-xs text-slate-500">Recaudo estimado</p><p className="text-2xl font-bold">S/ {totalRecaudado}</p></Card>
        <Card><p className="text-xs text-slate-500">Morosos</p><p className="text-2xl font-bold">{morosos}</p></Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Tabla de juntas</h2>
        <div className="space-y-2">
          {juntas.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <p>{j.nombre} · {j.estado}</p>
              <div className="flex gap-2">
                <Link href={`/juntas/${j.id}`}><Button variant="ghost">Inspeccionar</Button></Link>
                <Button variant="destructive" onClick={() => setData({ juntas: juntas.map((x) => (x.id === j.id ? { ...x, estado: 'bloqueada' } : x)) })}>Bloquear</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Alertas básicas</h2>
        <p className="text-sm text-slate-600">Incidencias abiertas: {morosos > 0 ? 'Morosidad detectada' : 'Sin incidencias críticas'}.</p>
      </Card>
    </div>
  );
}
