'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';

export default function AdminPaymentDetailPage({ params }: { params: { paymentId: string } }) {
  const router = useRouter();
  const { payments, juntas, schedules, setData } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const [note, setNote] = useState('');

  const payment = payments.find((item) => item.id === params.paymentId);
  if (!payment) return <Card>Pago no encontrado.</Card>;

  const junta = juntas.find((item) => item.id === payment.junta_id);
  const schedule = schedules.find((item) => item.id === payment.schedule_id);

  const updateStatus = (next: 'approved' | 'rejected' | 'validating') => {
    const now = new Date().toISOString();
    setData({
      payments: payments.map((item) => item.id === payment.id
        ? {
          ...item,
          estado: next,
          internal_note: note || item.internal_note,
          validated_at: next === 'approved' || next === 'rejected' ? now : item.validated_at,
          validated_by: next === 'approved' || next === 'rejected' ? (user?.id ?? 'backoffice') : item.validated_by,
          rejection_reason: next === 'rejected' ? note || 'Observado por backoffice' : item.rejection_reason
        }
        : item)
    });
    router.push('/admin/pagos');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold">Revisión de voucher</h1>
        <p className="text-sm text-slate-600">Junta: {junta?.nombre ?? 'Junta'}</p>
        <p className="text-sm text-slate-600">Semana/ronda: {schedule?.cuota_numero ?? '-'}</p>
        <p className="text-sm text-slate-600">Monto esperado: S/{(schedule?.monto ?? payment.monto).toFixed(2)}</p>
        <p className="text-sm text-slate-600">Monto enviado: S/{payment.monto.toFixed(2)}</p>
        <p className="text-sm text-slate-600">Método: {payment.payment_method ?? 'No especificado'}</p>
        <p className="text-sm text-slate-600">Nro operación: {payment.operation_number ?? '—'}</p>
        <p className="text-sm text-slate-600">Estado: <span className="font-semibold">{paymentStatusLabel(normalizePaymentStatus(payment.estado))}</span></p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Comprobante</h2>
        {payment.comprobante_url ? (
          <p className="text-sm break-all text-blue-700">{payment.comprobante_url}</p>
        ) : (
          <p className="text-sm text-slate-500">Sin comprobante adjunto.</p>
        )}
        <p className="text-xs text-slate-500">Nota del participante: {payment.participant_note ?? 'Sin observación'}</p>
      </Card>

      <Card className="space-y-2">
        <label className="text-sm font-medium">Comentario interno</label>
        <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => updateStatus('approved')}>Aprobar voucher</Button>
          <Button variant="destructive" onClick={() => updateStatus('rejected')}>Rechazar voucher</Button>
          <Button variant="outline" onClick={() => updateStatus('validating')}>Observar voucher</Button>
        </div>
      </Card>
    </div>
  );
}
