import { EstadoPago } from '@/types/domain';

export type PaymentLifecycleStatus = 'pending' | 'submitted' | 'validating' | 'approved' | 'rejected' | 'overdue';

export function normalizePaymentStatus(status?: EstadoPago): PaymentLifecycleStatus {
  if (status === 'aprobado' || status === 'approved') return 'approved';
  if (status === 'rechazado' || status === 'rejected') return 'rejected';
  if (status === 'pendiente_aprobacion' || status === 'submitted') return 'submitted';
  if (status === 'validating') return 'validating';
  if (status === 'overdue') return 'overdue';
  return 'pending';
}

export function paymentStatusLabel(status: PaymentLifecycleStatus) {
  if (status === 'approved') return 'Pagado';
  if (status === 'submitted' || status === 'validating') return 'En validación';
  if (status === 'rejected') return 'Rechazado';
  if (status === 'overdue') return 'Vencido';
  return 'Pendiente';
}
