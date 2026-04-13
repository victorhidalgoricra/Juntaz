import { addDays, addMonths } from 'date-fns';
import { Frecuencia, PaymentSchedule } from '@/types/domain';

export function generarCronograma(params: {
  juntaId: string;
  participantes: number;
  monto: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
}): PaymentSchedule[] {
  const start = new Date(params.fechaInicio);
  return Array.from({ length: params.participantes }).map((_, i) => {
    const date =
      params.frecuencia === 'semanal'
        ? addDays(start, i * 7)
        : params.frecuencia === 'quincenal'
          ? addDays(start, i * 14)
          : addMonths(start, i);

    return {
      id: crypto.randomUUID(),
      junta_id: params.juntaId,
      cuota_numero: i + 1,
      fecha_vencimiento: date.toISOString(),
      monto: params.monto,
      estado: 'pendiente'
    };
  });
}
