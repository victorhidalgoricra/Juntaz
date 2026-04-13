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
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return <Card><p className="text-sm text-slate-600">Inicia sesión para continuar.</p></Card>;
  }

  const list = payments.filter((p) => p.junta_id === params.id);
  const selectedSchedule = schedules.find((s) => s.id === scheduleId);
  const expectedAmount = selectedSchedule?.monto ?? null;

  const registerManualPayment = () => {
    setMessage(null);
    if (!scheduleId || !monto) {
      setMessage('Selecciona la cuota e ingresa un monto.');
      return;
    }

    const amount = Number(monto);
    const existing = list.find((payment) => payment.schedule_id === scheduleId && payment.profile_id === user.id);
    const existingStatus = normalizePaymentStatus(existing?.estado);

    if (existing && (existingStatus === 'submitted' || existingStatus === 'validating' || existingStatus === 'approved')) {
      setMessage('Ya registraste un pago para esta cuota y está en validación o aprobado.');
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      id: existing?.id ?? crypto.randomUUID(),
      junta_id: params.id,
      schedule_id: scheduleId,
      round_id: scheduleId,
      member_id: user.id,
      profile_id: user.id,
      expected_amount: expectedAmount ?? amount,
      submitted_amount: amount,
      monto: amount,
      estado: 'submitted' as const,
      payment_status: 'submitted' as const,
      submitted_at: now,
      pagado_en: now
    };

    setData({
      payments: existing
        ? payments.map((payment) => (payment.id === existing.id ? { ...payment, ...payload } : payment))
        : [...payments, payload]
    });

    setMonto('');
    setMessage('Pago registrado. Estado: En validación.');
  };

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
          <Button onClick={registerManualPayment}>Registrar</Button>
        </div>
        {message && <p className="mt-2 text-sm text-blue-700">{message}</p>}
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
              <p>{p.profile_id} · S/ {(p.submitted_amount ?? p.monto).toFixed(2)}</p>
              <div className="flex items-center gap-2">
                <Badge>{paymentStatusLabel(normalizePaymentStatus(p.estado))}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
