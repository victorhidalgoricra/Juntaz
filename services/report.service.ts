import { Payment, PaymentSchedule } from '@/types/domain';

export function resumenRecaudo(schedules: PaymentSchedule[], payments: Payment[]) {
  const esperado = schedules.reduce((acc, s) => acc + s.monto, 0);
  const recaudado = payments.filter((p) => p.estado === 'aprobado').reduce((acc, p) => acc + p.monto, 0);
  return {
    esperado,
    recaudado,
    morosidad: esperado > 0 ? Number((((esperado - recaudado) / esperado) * 100).toFixed(2)) : 0
  };
}

export function exportarPagosCsv(payments: Payment[]) {
  const rows = ['id,junta_id,profile_id,monto,estado,pagado_en'];
  payments.forEach((p) => rows.push(`${p.id},${p.junta_id},${p.profile_id},${p.monto},${p.estado},${p.pagado_en}`));
  return rows.join('\n');
}
