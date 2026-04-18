'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isBackofficeAdmin } from '@/services/auth-role.service';

export default function AdminPaymentDetailPage({ params }: { params: { paymentId: string } }) {
  const router = useRouter();
  const { payments, juntas, schedules, setData } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const [note, setNote] = useState('');

  if (!isBackofficeAdmin(user)) {
    return <Card>Solo el backoffice puede validar pagos.</Card>;
  }

  const payment = payments.find((item) => item.id === params.paymentId);
  if (!payment) return <Card>Pago no encontrado.</Card>;

  const junta = juntas.find((item) => item.id === payment.junta_id);
  const schedule = schedules.find((item) => item.id === payment.schedule_id);
  const receiptUrl = payment.receipt_url ?? payment.comprobante_url;
  const isImageReceipt = Boolean(receiptUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(receiptUrl));

  const timeline: Array<{ label: string; value: string }> = [];
  timeline.push({ label: 'Enviado', value: new Date(payment.submitted_at ?? payment.pagado_en).toLocaleString('es-PE') });
  if (payment.validated_at) timeline.push({ label: 'Validado', value: new Date(payment.validated_at).toLocaleString('es-PE') });
  if (payment.rejection_reason) timeline.push({ label: 'Rechazo', value: payment.rejection_reason });
  if (payment.internal_note) timeline.push({ label: 'Nota interna', value: payment.internal_note });

  const updateStatus = (next: 'approved' | 'rejected' | 'validating') => {
    const now = new Date().toISOString();
    setData({
      payments: payments.map((item) => item.id === payment.id
        ? {
          ...item,
          estado: next,
          payment_status: next,
          internal_note: note || item.internal_note,
          validated_at: next === 'approved' || next === 'rejected' ? now : item.validated_at,
          validated_by: next === 'approved' || next === 'rejected' ? (user?.id ?? 'backoffice') : item.validated_by,
          rejection_reason: next === 'rejected' ? note || 'Observado por backoffice' : undefined
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
        <p className="text-sm text-slate-600">Participante: {payment.profile_id}</p>
        <p className="text-sm text-slate-600">Semana/ronda: {schedule?.cuota_numero ?? '-'}</p>
        <p className="text-sm text-slate-600">Monto esperado: S/{(payment.expected_amount ?? schedule?.monto ?? payment.monto).toFixed(2)}</p>
        <p className="text-sm text-slate-600">Monto enviado: S/{(payment.submitted_amount ?? payment.monto).toFixed(2)}</p>
        <p className="text-sm text-slate-600">Método: {payment.payment_method ?? 'No especificado'}</p>
        <p className="text-sm text-slate-600">Nro operación: {payment.operation_number ?? '—'}</p>
        <p className="text-sm text-slate-600">Estado: <span className="font-semibold">{paymentStatusLabel(normalizePaymentStatus(payment.estado))}</span></p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Comprobante</h2>
        {receiptUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {isImageReceipt && <img src={receiptUrl} alt="Voucher" className="max-h-80 rounded border object-contain" />}
            <a className="text-sm break-all text-blue-700 underline" href={receiptUrl} target="_blank" rel="noreferrer">Abrir comprobante</a>
          </>
        ) : (
          <p className="text-sm text-slate-500">Sin comprobante adjunto.</p>
        )}
        <p className="text-xs text-slate-500">Nota del participante: {payment.participant_note ?? 'Sin observación'}</p>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Historial</h2>
        {timeline.map((item) => (
          <p key={item.label} className="text-sm text-slate-600"><span className="font-medium">{item.label}:</span> {item.value}</p>
        ))}
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
