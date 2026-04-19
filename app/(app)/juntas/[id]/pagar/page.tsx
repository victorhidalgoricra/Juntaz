'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isJuntaActive } from '@/lib/junta-status';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { fetchMembersByJuntaIds } from '@/services/juntas.repository';
import {
  PAYMENT_RECEIPT_ACCEPT,
  PaymentReceiptUploadError,
  uploadPaymentReceiptFile,
  validatePaymentReceiptFile
} from '@/services/payment-receipt-upload.service';
import { generarCronograma } from '@/services/schedule.service';
import { formatCalendarDate } from '@/lib/calendar-date';

export default function JuntaPayPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, members, setData } = useAppStore();

  const junta = juntas.find((item) => item.id === params.id);
  const juntaSchedules = schedules
    .filter((item) => item.junta_id === params.id)
    .sort((a, b) => a.cuota_numero - b.cuota_numero);
  const requestedCuotaId = searchParams.get('cuotaId');
  const isFromDashboard = searchParams.get('src') === 'dashboard';
  const today = new Date().toISOString().slice(0, 10);
  const currentSchedule = (requestedCuotaId ? juntaSchedules.find((item) => item.id === requestedCuotaId) : null)
    ?? juntaSchedules.find((item) => item.estado === 'pendiente')
    ?? juntaSchedules.find((item) => item.fecha_vencimiento >= today)
    ?? juntaSchedules[0];
  const isCreator = Boolean(user?.id && junta?.admin_id && user.id === junta.admin_id);
  const isMember = isCreator || members.some((member) => member.junta_id === params.id && member.profile_id === user?.id && member.estado === 'activo');

  const existingPayment = payments.find(
    (payment) => payment.junta_id === params.id && payment.profile_id === user?.id && payment.schedule_id === currentSchedule?.id
  );

  const expectedAmount = currentSchedule?.monto ?? junta?.monto_cuota ?? 0;
  const monto = expectedAmount;
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
  const alreadyPaid = currentStatus === 'approved';
  const isUnderValidation = currentStatus === 'submitted' || currentStatus === 'validating';

  const scheduleLabel = useMemo(() => {
    if (!currentSchedule) return 'Ronda no disponible';
    return `Semana ${currentSchedule.cuota_numero} · vence ${formatCalendarDate(currentSchedule.fecha_vencimiento)}`;
  }, [currentSchedule]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!junta) return;
    if (juntaSchedules.length > 0) return;

    const fallbackSchedules = generarCronograma({
      juntaId: junta.id,
      participantes: junta.participantes_max,
      monto: junta.cuota_base ?? junta.monto_cuota,
      frecuencia: junta.frecuencia_pago,
      fechaInicio: junta.fecha_inicio
    });
    setData({ schedules: [...schedules, ...fallbackSchedules] });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Registrar pago debug] schedule fallback generado', {
        juntaId: junta.id,
        generatedRounds: fallbackSchedules.length
      });
    }
  }, [junta, juntaSchedules.length, schedules, setData]);

  useEffect(() => {
    if (!user || !junta) return;
    if (isMember) return;
    if (!hasSupabase) return;

    fetchMembersByJuntaIds([junta.id]).then((result) => {
      if (!result.ok) return;
      if (result.data.length === 0) return;
      setData({ members: [...members.filter((m) => m.junta_id !== junta.id), ...result.data] });
    });
  }, [isMember, junta, members, setData, user]);

  useEffect(() => {
    if (!receiptFile || receiptFile.type === 'application/pdf') {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(receiptFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  useEffect(() => {
    if (!user || !junta || !currentSchedule || !isMember || !isJuntaActive(junta.estado)) return;
    if (existingPayment) return;

    const now = new Date().toISOString();
    setData({
      payments: [
        ...payments,
        {
          id: crypto.randomUUID(),
          junta_id: junta.id,
          schedule_id: currentSchedule.id,
          round_id: currentSchedule.id,
          member_id: user.id,
          profile_id: user.id,
          expected_amount: currentSchedule.monto,
          submitted_amount: currentSchedule.monto,
          monto: currentSchedule.monto,
          estado: 'pending',
          payment_status: 'pending',
          submitted_at: now,
          pagado_en: now
        }
      ]
    });
  }, [currentSchedule, existingPayment, isMember, junta, payments, setData, user]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('[Registrar pago debug]', {
      juntaId: junta?.id,
      juntaEstado: junta?.estado,
      currentScheduleId: currentSchedule?.id,
      currentScheduleCuota: currentSchedule?.cuota_numero,
      memberId: user?.id,
      isMember,
      isCreator,
      existingPaymentId: existingPayment?.id,
      existingPaymentStatus: existingPayment?.estado,
      blockerReason: !junta
        ? 'junta_missing'
        : !isJuntaActive(junta.estado)
          ? 'junta_inactive'
          : !isMember
            ? 'not_member'
            : !currentSchedule
              ? 'schedule_missing'
              : 'ready'
    });
  }, [currentSchedule, existingPayment, isCreator, isMember, junta, user]);

  if (!user) return <Card>Debes iniciar sesión.</Card>;
  if (!isMember) return <Card>Solo los integrantes activos de esta junta pueden registrar pagos.</Card>;
  if (!junta || !currentSchedule) return <Card>No encontramos una cuota/ronda pendiente para esta junta.</Card>;
  if (!isJuntaActive(junta.estado)) return <Card>Aún no puedes registrar pagos porque la junta no está activa.</Card>;

  const uploadReceiptIfNeeded = async () => {
    if (!receiptFile) return fileName || undefined;
    if (!hasSupabase || !supabase) return receiptFile.name;
    return uploadPaymentReceiptFile({
      supabase,
      file: receiptFile,
      juntaId: params.id,
      profileId: user.id,
      scheduleId: currentSchedule.id
    });
  };

  const submitVoucher = async (event: FormEvent) => {
    event.preventDefault();
    if (!isJuntaActive(junta.estado)) {
      setMessage('La junta aún no está activa');
      return;
    }
    if (monto !== expectedAmount) {
      setMessage('Solo puedes registrar el monto completo de la cuota');
      return;
    }
    if (!receiptFile && !fileName) {
      setMessage('Debes subir un voucher para enviar tu pago');
      return;
    }
    if (!canSubmitPayment) {
      setMessage('Ya tienes un pago enviado para esta cuota');
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
        expected_amount: expectedAmount,
        submitted_amount: expectedAmount,
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

      setMessage('Tu pago fue enviado correctamente y está pendiente de validación');
      setTimeout(() => router.push(`/juntas/${junta.id}?view=participante`), 900);
    } catch (error) {
      console.error('[Registrar pago] error', error);
      if (error instanceof PaymentReceiptUploadError) {
        console.error(error.technicalMessage);
        setMessage(error.userMessage);
      } else {
        setMessage(error instanceof Error ? error.message : 'No pudimos registrar tu pago.');
      }
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
        <p className="text-sm text-slate-600">Fecha límite: <span className="font-semibold">{formatCalendarDate(currentSchedule.fecha_vencimiento)}</span></p>
        <p className="text-sm text-slate-600">Estado actual: <span className="font-semibold">{paymentStatusLabel(currentStatus)}</span></p>
        {alreadyPaid && <p className="text-sm font-medium text-emerald-700">Pago ya registrado</p>}
        {isUnderValidation && <p className="text-sm font-medium text-blue-700">Tu pago está en validación</p>}
      </Card>

      <form onSubmit={submitVoucher} className="space-y-3">
        <Card className="space-y-3">
          <label className="text-sm font-medium">Monto de la cuota (fijo)</label>
          <Input type="number" value={monto} readOnly />

          <label className="text-sm font-medium">Método de pago</label>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={method} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setMethod(event.target.value as 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro')}>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>

          <label className="text-sm font-medium">Número de operación (opcional)</label>
          <Input value={operationNumber} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setOperationNumber(event.target.value)} />

          <label className="text-sm font-medium">Voucher / comprobante (obligatorio · JPG, PNG o PDF)</label>
          <Input
            type="file"
            accept={PAYMENT_RECEIPT_ACCEPT}
            disabled={isUnderValidation || alreadyPaid}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const validationError = validatePaymentReceiptFile(file);
              if (validationError) {
                if (process.env.NODE_ENV === 'development') {
                  console.error(validationError.technicalMessage);
                }
                setMessage(validationError.userMessage);
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
          <textarea className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm" value={note} disabled={isUnderValidation || alreadyPaid} onChange={(event) => setNote(event.target.value)} />
        </Card>

        {message && <p className="text-sm text-blue-700">{message}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting || alreadyPaid || isUnderValidation}>{submitting ? 'Enviando...' : isFromDashboard ? 'Confirmar pago' : 'Enviar a validación'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/juntas/${junta.id}?view=participante`)}>Volver</Button>
        </div>
      </form>
    </div>
  );
}
