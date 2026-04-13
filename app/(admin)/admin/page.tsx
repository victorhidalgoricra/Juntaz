'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export default function AdminPage() {
  const { juntas, members, payments, schedules, setData } = useAppStore();
  const authUser = useAuthStore((s) => s.user);
  const [notesByPayment, setNotesByPayment] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<Array<{
    paymentId: string;
    previousStatus: string;
    newStatus: string;
    changedBy: string;
    comment?: string;
    changedAt: string;
  }>>([]);

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

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.estado === 'pendiente_aprobacion').map((payment) => {
      const junta = juntas.find((item) => item.id === payment.junta_id);
      const schedule = schedules.find((item) => item.id === payment.schedule_id);
      const member = members.find((item) => item.junta_id === payment.junta_id && item.profile_id === payment.profile_id);
      return {
        payment,
        juntaName: junta?.nombre ?? 'Junta',
        semana: schedule?.cuota_numero ?? 0,
        participante: member?.rol === 'admin' ? 'Creador' : `Participante turno ${member?.orden_turno ?? '-'}`,
        expectedAmount: schedule?.monto ?? payment.monto,
        submittedAmount: payment.monto,
        submittedAt: payment.pagado_en
      };
    }),
    [juntas, members, payments, schedules]
  );

  const updatePaymentStatus = (paymentId: string, newStatus: 'aprobado' | 'rechazado' | 'pendiente_aprobacion') => {
    const target = payments.find((payment) => payment.id === paymentId);
    if (!target || !authUser) return;
    const previousStatus = target.estado;
    const comment = notesByPayment[paymentId]?.trim();

    setData({
      payments: payments.map((payment) => payment.id === paymentId ? { ...payment, estado: newStatus } : payment)
    });

    setAuditLogs((prev) => [
      {
        paymentId,
        previousStatus,
        newStatus,
        changedBy: authUser.nombre || authUser.email || 'Backoffice',
        comment: comment || undefined,
        changedAt: new Date().toISOString()
      },
      ...prev
    ]);
  };

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
                <p>{j.admin_id === authUser?.id ? 'Tú' : 'Creador'}</p>
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
              <p>{u.id === authUser?.id ? 'Tú' : 'Usuario'}</p>
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

      <Card className="space-y-3">
        <h2 className="font-semibold">Pagos pendientes de validación</h2>
        {pendingPayments.length === 0 ? (
          <p className="text-sm text-slate-500">No hay pagos pendientes por validar.</p>
        ) : (
          <div className="space-y-2">
            {pendingPayments.map((row) => (
              <div key={row.payment.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_0.6fr_1fr_1fr_1fr_auto]">
                <div>
                  <p className="font-semibold">{row.juntaName}</p>
                  <p className="text-xs text-slate-500">Semana {row.semana} · {row.participante}</p>
                </div>
                <p>Esperado: S/ {row.expectedAmount.toFixed(2)}</p>
                <p>Reportado: S/ {row.submittedAmount.toFixed(2)}</p>
                <p>Enviado: {new Date(row.submittedAt).toLocaleDateString('es-PE')}</p>
                <input
                  className="rounded border px-2 py-1 text-xs"
                  placeholder="Comentario interno"
                  value={notesByPayment[row.payment.id] ?? ''}
                  onChange={(event) => setNotesByPayment((prev) => ({ ...prev, [row.payment.id]: event.target.value }))}
                />
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" onClick={() => updatePaymentStatus(row.payment.id, 'aprobado')}>Aprobar</Button>
                  <Button variant="destructive" onClick={() => updatePaymentStatus(row.payment.id, 'rechazado')}>Rechazar</Button>
                  <Button variant="ghost" onClick={() => updatePaymentStatus(row.payment.id, 'pendiente_aprobacion')}>Observar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Historial de validación (auditoría)</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin cambios de validación en esta sesión.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={`${log.paymentId}-${log.changedAt}`} className="rounded border p-2 text-sm">
                <p><span className="font-medium">Estado:</span> {log.previousStatus} → {log.newStatus}</p>
                <p className="text-xs text-slate-500">Por: {log.changedBy} · {new Date(log.changedAt).toLocaleString('es-PE')}</p>
                {log.comment && <p className="text-xs text-slate-600">Nota: {log.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
