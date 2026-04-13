'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { exportarPagosCsv } from '@/services/report.service';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';

export default function PaymentsPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const { payments, schedules, setData } = useAppStore();
  const [monto, setMonto] = useState('');
  const [scheduleId, setScheduleId] = useState('');


  if (!user) {
    return <Card><p className="text-sm text-slate-600">Inicia sesión para continuar.</p></Card>;
  }

  const list = payments.filter((p) => p.junta_id === params.id);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Registrar aporte manual</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
            <option value="">Seleccionar cuota</option>
            {schedules.filter((s) => s.junta_id === params.id).map((s) => <option key={s.id} value={s.id}>Cuota {s.cuota_numero}</option>)}
          </Select>
          <Input placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} />
          <Button
            onClick={() => {
              if (!scheduleId || !monto) return;
              setData({
                payments: [
                  ...payments,
                  {
                    id: crypto.randomUUID(),
                    junta_id: params.id,
                    schedule_id: scheduleId,
                    profile_id: user.id,
                    monto: Number(monto),
                    estado: 'submitted',
                    pagado_en: new Date().toISOString()
                  }
                ]
              });
              setMonto('');
            }}
          >
            Registrar
          </Button>
        </div>
      </Card>
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historial de pagos</h2>
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
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <p>{p.profile_id} · S/ {p.monto}</p>
              <div className="flex items-center gap-2">
                <Badge>{paymentStatusLabel(normalizePaymentStatus(p.estado))}</Badge>
                {(normalizePaymentStatus(p.estado) === 'submitted' || normalizePaymentStatus(p.estado) === 'validating') && (
                  <>
                    <Button variant="ghost" onClick={() => setData({ payments: payments.map((x) => (x.id === p.id ? { ...x, estado: 'approved' } : x)) })}>Aprobar</Button>
                    <Button variant="destructive" onClick={() => setData({ payments: payments.map((x) => (x.id === p.id ? { ...x, estado: 'rejected' } : x)) })}>Rechazar</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
