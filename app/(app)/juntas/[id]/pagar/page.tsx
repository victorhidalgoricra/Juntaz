'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isJuntaActive } from '@/lib/junta-status';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

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

  const [monto, setMonto] = useState<number>(existingPayment?.submitted_amount ?? existingPayment?.monto ?? currentSchedule?.monto ?? junta?.monto_cuota ?? 0);
  const [method, setMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro'>(existingPayment?.payment_method ?? 'yape');
  const [operationNumber, setOperationNumber] = useState(existingPayment?.operation_number ?? '');
  const [note, setNote] = useState(existingPayment?.participant_note ?? '');
  const [fileName, setFileName] = useState(existingPayment?.receipt_url ?? existingPayment?.comprobante_url ?? '');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentStatus = normalizePaymentStatus(existingPayment?.estado);
  const canSubmitPayment = !existingPayment || currentStatus === 'pending' || currentStatus === 'rejected' || currentStatus === 'overdue';

  const scheduleLabel = useMemo(() => {
    if (!currentSchedule) return 'Ronda no disponible';
    return `Semana ${currentSchedule.cuota_numero} · vence ${new Date(currentSchedule.fecha_vencimiento).toLocaleDateString('es-PE')}`;
  }, [currentSchedule]);

  useEffect(() => {
    if (!receiptFile || receiptFile.type === 'application/pdf') {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  if (!user) return <Card>Debes iniciar sesión.</Card>;
  if (!junta || !currentSchedule) return <Card>No encontramos datos de pago para esta junta.</Card>;
  if (!isJuntaActive(junta.estado)) return <Card>Aún no puedes registrar pagos porque la junta no está activa.</Card>;

  const uploadReceiptIfNeeded = async () => {
    if (!receiptFile) return fileName || undefined;
    if (!hasSupabase || !supabase) return receiptFile.name;

    const ext = receiptFile.name.split('.').pop() ?? 'bin';
    const path = `${params.id}/${user.id}/${currentSchedule.id}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('payment-receipts').upload(path, receiptFile, { upsert: true });
    if (error) throw new Error(`No pudimos subir el comprobante: ${error.message}`);

    const { data } = supabase.storage.from('payment-receipts').getPublicUrl(path);
    return data.publicUrl;
  };

  const submitVoucher = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmitPayment) {
      setMessage('Ya tienes un pago en validación o aprobado para esta semana.');
      return;
    }

    try {
      setSubmitting(true);
      const receiptUrl = await uploadReceiptIfNeeded();
      const paymentId = existingPayment?.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      const nextStatus = 'submitted' as const;

      const nextPayment = {
        id: paymentId,
        junta_id: junta.id,
        schedule_id: currentSchedule.id,
        round_id: currentSchedule.id,
        member_id: user.id,
        profile_id: user.id,
        expected_amount: currentSchedule.monto,
        submitted_amount: monto,
        monto,
        estado: nextStatus,
        receipt_url: receiptUrl,
        comprobante_url: receiptUrl,
        payment_method: method,
        operation_number: operationNumber || undefined,
        participant_note: note || undefined,
        internal_note: existingPayment?.internal_note,
        payment_status: nextStatus,
        submitted_at: now,
        pagado_en: now,
        validated_at: existingPayment?.validated_at,
        validated_by: existingPayment?.validated_by,
        rejection_reason: undefined
      };

      setData({
        payments: existingPayment
          ? payments.map((payment) => (payment.id === existingPayment.id ? { ...payment, ...nextPayment } : payment))
          : [...payments, nextPayment]
      });

      setMessage('Tu comprobante fue enviado correctamente y está pendiente de validación.');
      setTimeout(() => router.push(`/juntas/${junta.id}?view=participante`), 900);
    } catch (error) {
      console.error('[Registrar pago] error', error);
      setMessage(error instanceof Error ? error.message : 'No pudimos registrar tu pago.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-2">
        <h1 className="text-2xl font-semibold">Registrar pago</h1>
        <p className="text-sm text-slate-600">{junta.nombre}</p>
        <p className="text-sm text-slate-600">{scheduleLabel}</p>
        <p className="text-sm text-slate-600">Monto esperado: <span className="font-semibold">S/ {currentSchedule.monto.toFixed(2)}</span></p>
        <p className="text-sm text-slate-600">Fecha límite: <span className="font-semibold">{new Date(currentSchedule.fecha_vencimiento).toLocaleDateString('es-PE')}</span></p>
        <p className="text-sm text-slate-600">Estado actual: <span className="font-semibold">{paymentStatusLabel(currentStatus)}</span></p>
      </Card>

      <form onSubmit={submitVoucher} className="space-y-3">
        <Card className="space-y-3">
          <label className="text-sm font-medium">Monto enviado</label>
          <Input type="number" value={monto} onChange={(event) => setMonto(Number(event.target.value))} />

          <label className="text-sm font-medium">Método de pago</label>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={method} onChange={(event) => setMethod(event.target.value as 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro')}>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>

          <label className="text-sm font-medium">Número de operación (opcional)</label>
          <Input value={operationNumber} onChange={(event) => setOperationNumber(event.target.value)} />

          <label className="text-sm font-medium">Voucher / comprobante (JPG, PNG o PDF)</label>
          <Input
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
                setMessage('Formato no permitido. Usa JPG, PNG o PDF.');
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                setMessage('El archivo supera 5MB. Sube un comprobante más liviano.');
                return;
              }
              setReceiptFile(file);
              setFileName(file.name);
              setMessage(null);
            }}
          />
          {fileName && <p className="text-xs text-slate-500">Archivo seleccionado: {fileName}</p>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrl && <img src={previewUrl} alt="Preview del comprobante" className="max-h-60 rounded-md border object-contain" />}
          {!previewUrl && receiptFile?.type === 'application/pdf' && <p className="text-xs text-blue-700">PDF cargado correctamente. Se enviará como comprobante.</p>}

          <label className="text-sm font-medium">Observación (opcional)</label>
          <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} />
        </Card>

        {message && <p className="text-sm text-blue-700">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting || !canSubmitPayment}>{submitting ? 'Enviando...' : 'Enviar pago'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}>Volver</Button>
        </div>
      </form>
    </div>
  );
}
