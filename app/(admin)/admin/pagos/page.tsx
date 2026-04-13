'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';

export default function AdminPaymentsPage() {
  const { payments, juntas, members, schedules } = useAppStore();

  const reviewable = payments.filter((payment) => {
    const status = normalizePaymentStatus(payment.estado);
    return status === 'submitted' || status === 'validating' || status === 'rejected';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Backoffice · Pagos</h1>
        <Link href="/admin"><Button variant="outline">Volver al panel</Button></Link>
      </div>

      <Card className="space-y-2">
        {reviewable.length === 0 ? (
          <p className="text-sm text-slate-500">No hay vouchers por revisar.</p>
        ) : reviewable.map((payment) => {
          const junta = juntas.find((item) => item.id === payment.junta_id);
          const member = members.find((item) => item.junta_id === payment.junta_id && item.profile_id === payment.profile_id);
          const schedule = schedules.find((item) => item.id === payment.schedule_id);
          return (
            <div key={payment.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
              <div>
                <p className="font-medium">{junta?.nombre ?? 'Junta'}</p>
                <p className="text-xs text-slate-500">{member?.rol === 'admin' ? 'Creador' : `Participante turno ${member?.orden_turno ?? '-'}`}</p>
              </div>
              <p>Semana {schedule?.cuota_numero ?? '-'}</p>
              <p>Esperado: S/{(schedule?.monto ?? payment.monto).toFixed(2)}</p>
              <p>Reportado: S/{payment.monto.toFixed(2)}</p>
              <p className="font-medium">{paymentStatusLabel(normalizePaymentStatus(payment.estado))}</p>
              <Link href={`/admin/pagos/${payment.id}`}><Button variant="outline">Revisar</Button></Link>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
