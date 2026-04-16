import type { SupabaseClient } from '@supabase/supabase-js';

export const PAYMENT_RECEIPTS_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_PAYMENT_RECEIPTS_BUCKET?.trim() || 'payment-receipts';
export const PAYMENT_RECEIPT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'] as const;
export const PAYMENT_RECEIPT_ACCEPT = PAYMENT_RECEIPT_ALLOWED_MIME_TYPES.join(',');
export const PAYMENT_RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

type UploadPaymentReceiptParams = {
  supabase: SupabaseClient;
  file: File;
  juntaId: string;
  profileId: string;
  scheduleId: string;
};

export class PaymentReceiptUploadError extends Error {
  constructor(
    public readonly userMessage: string,
    public readonly technicalMessage: string
  ) {
    super(userMessage);
    this.name = 'PaymentReceiptUploadError';
  }
}

export function validatePaymentReceiptFile(file: File): PaymentReceiptUploadError | null {
  if (!PAYMENT_RECEIPT_ALLOWED_MIME_TYPES.includes(file.type as (typeof PAYMENT_RECEIPT_ALLOWED_MIME_TYPES)[number])) {
    return new PaymentReceiptUploadError(
      'Formato no permitido. Solo se aceptan JPG, PNG o PDF.',
      `[payment-receipt] invalid mime type "${file.type}" for file "${file.name}"`
    );
  }

  if (file.size > PAYMENT_RECEIPT_MAX_SIZE_BYTES) {
    return new PaymentReceiptUploadError(
      'El archivo supera 5MB. Sube un comprobante más liviano.',
      `[payment-receipt] file exceeds max size (${file.size} bytes > ${PAYMENT_RECEIPT_MAX_SIZE_BYTES}) for "${file.name}"`
    );
  }

  return null;
}

function resolveExtension(file: File) {
  const extFromName = file.name.split('.').pop()?.toLowerCase();
  if (extFromName) return extFromName;
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  return 'jpg';
}

export async function uploadPaymentReceiptFile(params: UploadPaymentReceiptParams) {
  const ext = resolveExtension(params.file);
  const safeFileName = `${params.scheduleId}-${Date.now()}.${ext}`;
  const path = `${params.juntaId}/${params.profileId}/${safeFileName}`;

  const { error } = await params.supabase.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .upload(path, params.file, { upsert: true, contentType: params.file.type });

  if (error) {
    if (/bucket.*not found/i.test(error.message)) {
      throw new PaymentReceiptUploadError(
        'No pudimos guardar el comprobante porque la configuración de almacenamiento aún no está lista. Intenta nuevamente en unos minutos o contacta soporte.',
        `[payment-receipt] storage bucket "${PAYMENT_RECEIPTS_BUCKET}" not found. Supabase error: ${error.message}`
      );
    }

    throw new PaymentReceiptUploadError(
      'No pudimos subir tu comprobante en este momento. Intenta nuevamente.',
      `[payment-receipt] upload failed. bucket="${PAYMENT_RECEIPTS_BUCKET}" path="${path}" error="${error.message}"`
    );
  }

  const { data } = params.supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new PaymentReceiptUploadError(
      'Tu comprobante se subió, pero no pudimos generar el enlace para validación. Intenta nuevamente.',
      `[payment-receipt] public URL generation failed. bucket="${PAYMENT_RECEIPTS_BUCKET}" path="${path}"`
    );
  }

  return data.publicUrl;
}
