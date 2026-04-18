import { addFrequencyToDate } from '@/lib/calendar-date';
import { Frecuencia, PaymentSchedule } from '@/types/domain';

export function generarCronograma(params: {
  juntaId: string;
  participantes: number;
  monto: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
}): PaymentSchedule[] {
  return Array.from({ length: params.participantes }).map((_, i) => {
    const date = addFrequencyToDate(params.fechaInicio, params.frecuencia, i);

    return {
      id: crypto.randomUUID(),
      junta_id: params.juntaId,
      cuota_numero: i + 1,
      fecha_vencimiento: date,
      monto: params.monto,
      estado: 'pendiente'
    };
  });
}
