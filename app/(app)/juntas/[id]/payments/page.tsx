'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { exportarPagosCsv } from '@/services/report.service';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';

export default function PaymentsPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const { payments, schedules, juntas } = useAppStore();

  if (!user) {
    return <Card><p className="text-sm text-slate-600">Inicia sesión para continuar.</p></Card>;
  }

  const junta = juntas.find((j) => j.id === params.id);
  const list = payments
    .filter((p) => p.junta_id === params.id)
    .sort((a, b) => (b.submitted_at ?? b.pagado_en).localeCompare(a.submitted_at ?? a.pagado_en));

  const pendingSchedules = schedules
    .filter((schedule) => schedule.junta_id === params.id && (schedule.estado === 'pendiente' || schedule.estado === 'vencida'))
    .sort((a, b) => a.cuota_numero - b.cuota_numero);

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1 className="text-xl font-semibold">Historial de pagos</h1>
        <p className="text-sm text-slate-600">{junta?.nombre ?? 'Junta'} · Gestiona tus pagos pendientes y revisa el estado de validación.</p>
        {pendingSchedules.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {pendingSchedules.map((schedule) => (
              <Link key={schedule.id} href={`/juntas/${params.id}/registrar-pago?juntaId=${encodeURIComponent(params.id)}&cuotaId=${encodeURIComponent(schedule.id)}&src=history`}>
                <Button variant="outline">Pagar cuota {schedule.cuota_numero}</Button>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No tienes cuotas pendientes por registrar en este momento.</p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Movimientos</h2>
          <Button
            variant="outline"
            onClick={() => {
              const csv = exportarPagosCsv(list);
              const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `pagos-${params.id}.csv`;
              a.click();
            }}
          >
            Exportar CSV
          </Button>
        </div>

        {list.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras pagos en esta junta.</p>
        ) : (
          <div className="space-y-2">
            {list.map((payment) => {
              const status = normalizePaymentStatus(payment.estado);
              const schedule = schedules.find((s) => s.id === payment.schedule_id);
              const canRetry = status === 'pending' || status === 'rejected' || status === 'overdue';

              return (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
                  <div>
                    <p className="font-medium">Cuota {schedule?.cuota_numero ?? '-'}</p>
                    <p className="text-slate-600">Monto: S/ {(payment.submitted_amount ?? payment.monto).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{new Date(payment.submitted_at ?? payment.pagado_en).toLocaleString('es-PE')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge>{paymentStatusLabel(status)}</Badge>
                    {canRetry && (
                      <Link href={`/juntas/${params.id}/registrar-pago?juntaId=${encodeURIComponent(params.id)}&cuotaId=${encodeURIComponent(payment.schedule_id)}&src=history`}>
                        <Button variant="outline">Registrar pago</Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
