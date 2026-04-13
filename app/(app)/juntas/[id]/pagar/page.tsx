'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';

export default function JuntaPayPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, setData } = useAppStore();

  const junta = juntas.find((item) => item.id === params.id);
  const currentSchedule = schedules
    .filter((item) => item.junta_id === params.id)
    .sort((a, b) => a.cuota_numero - b.cuota_numero)[0];

  const existingPayment = payments.find(
    (payment) => payment.junta_id === params.id && payment.profile_id === user?.id && payment.schedule_id === currentSchedule?.id
  );

  const [monto, setMonto] = useState<number>(existingPayment?.monto ?? currentSchedule?.monto ?? junta?.monto_cuota ?? 0);
  const [method, setMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro'>(existingPayment?.payment_method ?? 'yape');
  const [operationNumber, setOperationNumber] = useState(existingPayment?.operation_number ?? '');
  const [note, setNote] = useState(existingPayment?.participant_note ?? '');
  const [fileName, setFileName] = useState(existingPayment?.comprobante_url ?? '');
  const [message, setMessage] = useState<string | null>(null);

  const currentStatus = normalizePaymentStatus(existingPayment?.estado);
  const canEdit = currentStatus !== 'approved';

  const scheduleLabel = useMemo(() => {
    if (!currentSchedule) return 'Ronda no disponible';
    return `Semana ${currentSchedule.cuota_numero} · vence ${new Date(currentSchedule.fecha_vencimiento).toLocaleDateString('es-PE')}`;
  }, [currentSchedule]);

  if (!user) return <Card>Debes iniciar sesión.</Card>;
  if (!junta || !currentSchedule) return <Card>No encontramos datos de pago para esta junta.</Card>;

  const submitVoucher = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    const paymentId = existingPayment?.id ?? crypto.randomUUID();
    const nextStatus = 'submitted' as const;
    const now = new Date().toISOString();

    const nextPayment = {
      id: paymentId,
      junta_id: junta.id,
      schedule_id: currentSchedule.id,
      profile_id: user.id,
      monto,
      estado: nextStatus,
      comprobante_url: fileName || undefined,
      payment_method: method,
      operation_number: operationNumber || undefined,
      participant_note: note || undefined,
      pagado_en: now
    };

    setData({
      payments: existingPayment
        ? payments.map((payment) => (payment.id === existingPayment.id ? { ...payment, ...nextPayment } : payment))
        : [...payments, nextPayment]
    });

    setMessage('Tu voucher fue enviado y está pendiente de validación.');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold">Subir voucher</h1>
        <p className="text-sm text-slate-600">{junta.nombre}</p>
        <p className="text-sm text-slate-600">{scheduleLabel}</p>
        <p className="text-sm text-slate-600">Monto esperado: <span className="font-semibold">S/ {currentSchedule.monto.toFixed(2)}</span></p>
        <p className="text-sm text-slate-600">Estado actual: <span className="font-semibold">{paymentStatusLabel(currentStatus)}</span></p>
      </Card>

      <form onSubmit={submitVoucher} className="space-y-3">
        <Card className="space-y-3">
          <label className="text-sm font-medium">Comprobante (imagen o PDF)</label>
          <Input
            type="file"
            accept="image/*,.pdf"
            disabled={!canEdit}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                setMessage('El archivo supera 5MB. Sube un comprobante más liviano.');
                return;
              }
              setFileName(file.name);
            }}
          />
          {fileName && <p className="text-xs text-slate-500">Archivo seleccionado: {fileName}</p>}

          <label className="text-sm font-medium">Monto enviado</label>
          <Input type="number" value={monto} disabled={!canEdit} onChange={(event) => setMonto(Number(event.target.value))} />

          <label className="text-sm font-medium">Método de pago</label>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={method} disabled={!canEdit} onChange={(event) => setMethod(event.target.value as 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro')}>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>

          <label className="text-sm font-medium">Número de operación (opcional)</label>
          <Input value={operationNumber} disabled={!canEdit} onChange={(event) => setOperationNumber(event.target.value)} />

          <label className="text-sm font-medium">Observación (opcional)</label>
          <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm" value={note} disabled={!canEdit} onChange={(event) => setNote(event.target.value)} />
        </Card>

        {message && <p className="text-sm text-blue-700">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={!canEdit}>Enviar voucher</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}>Volver</Button>
        </div>
      </form>
    </div>
  );
}
