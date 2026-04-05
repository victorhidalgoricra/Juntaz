'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export default function AdminPage() {
  const { juntas, members, payments, schedules, setData } = useAppStore();
  const authUser = useAuthStore((s) => s.user);

  const activas = juntas.filter((j) => j.estado === 'activa').length;
  const borrador = juntas.filter((j) => j.estado === 'borrador').length;
  const montoEstimado = juntas.reduce((acc, j) => acc + j.monto_cuota * j.participantes_max, 0);
  const morosas = members.filter((m) => m.estado === 'moroso').length;

  const userRows = Array.from(new Set(members.map((m) => m.profile_id))).map((id) => ({
    id,
    role: authUser?.id === id && authUser.global_role === 'admin' ? 'admin' : 'user',
    juntas: members.filter((m) => m.profile_id === id).length,
    estado: members.some((m) => m.profile_id === id && m.estado === 'moroso') ? 'moroso' : 'activo'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backoffice Administrador</h1>
        <Link href="/dashboard"><Button variant="outline">Ir al producto</Button></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <Card><p className="text-xs text-slate-500">Total usuarios</p><p className="text-2xl font-bold">{userRows.length}</p></Card>
        <Card><p className="text-xs text-slate-500">Total juntas</p><p className="text-2xl font-bold">{juntas.length}</p></Card>
        <Card><p className="text-xs text-slate-500">Juntas activas</p><p className="text-2xl font-bold">{activas}</p></Card>
        <Card><p className="text-xs text-slate-500">Juntas borrador</p><p className="text-2xl font-bold">{borrador}</p></Card>
        <Card><p className="text-xs text-slate-500">Monto estimado total</p><p className="text-2xl font-bold">S/ {montoEstimado.toFixed(2)}</p></Card>
        <Card><p className="text-xs text-slate-500">Juntas con mora</p><p className="text-2xl font-bold">{morosas}</p></Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Tabla de juntas</h2>
        <div className="space-y-2">
          {juntas.map((j) => {
            const memberCount = members.filter((m) => m.junta_id === j.id).length;
            return (
              <div key={j.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-2 rounded border p-2 text-xs md:text-sm">
                <p>{j.nombre}</p>
                <p>{j.admin_id.slice(0, 8)}</p>
                <p>{j.estado}</p>
                <p>{memberCount}/{j.participantes_max}</p>
                <p>{j.moneda} {j.monto_cuota}</p>
                <div className="flex gap-1">
                  <Link href={`/juntas/${j.id}`}><Button variant="ghost">Detalle</Button></Link>
                  <Button variant="destructive" onClick={() => setData({ juntas: juntas.map((x) => (x.id === j.id ? { ...x, estado: 'bloqueada' } : x)) })}>Desactivar</Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Tabla de usuarios</h2>
        <div className="space-y-2">
          {userRows.map((u) => (
            <div key={u.id} className="grid grid-cols-4 rounded border p-2 text-sm">
              <p>{u.id.slice(0, 10)}</p>
              <p>{u.role}</p>
              <p>{u.juntas} juntas</p>
              <p>{u.estado}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Incidencias / errores</h2>
        <p className="text-sm text-slate-600">Pagos pendientes: {payments.filter((p) => p.estado === 'pendiente_aprobacion').length}</p>
        <p className="text-sm text-slate-600">Cuotas vencidas: {schedules.filter((s) => s.estado === 'vencida').length}</p>
      </Card>
    </div>
  );
}
