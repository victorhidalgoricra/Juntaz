import { isSameDay } from 'date-fns';
import { parseCalendarDate } from '@/lib/calendar-date';
import { getCurrentRoundReceiver, getParticipantDisplayName, getReceiverPaymentDetails } from '@/lib/payment-instructions';
import { Junta, JuntaMember, Payment, PaymentSchedule, Profile } from '@/types/domain';

export type PaymentDebtStatus = 'pendiente' | 'vence_hoy' | 'vencida' | 'pagada';

export type PaymentDebtItem = {
  id: string;
  juntaId: string;
  juntaNombre: string;
  cuotaId: string;
  cuotaNumero: number;
  dueDate: string;
  monto: number;
  receiverName: string;
  receiverId: string | null;
  receiverMethod: string;
  receiverMethodConfigured: boolean;
  myPayoutConfigured: boolean;
  status: PaymentDebtStatus;
};

export function getMyJuntaIdsForPayments(userId: string, juntas: Junta[], members: JuntaMember[]) {
  const owned = juntas.filter((junta) => junta.admin_id === userId).map((junta) => junta.id);
  const memberOf = members.filter((member) => member.profile_id === userId).map((member) => member.junta_id);
  return Array.from(new Set([...owned, ...memberOf]));
}

export function buildPaymentDebtItems(params: {
  userId: string;
  juntas: Junta[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  profilesById: Record<string, Profile>;
  fallbackProfile?: Profile | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const myJuntaIds = getMyJuntaIdsForPayments(params.userId, params.juntas, params.members);

  return params.schedules
    .filter((schedule) => myJuntaIds.includes(schedule.junta_id))
    .map((schedule) => {
      const junta = params.juntas.find((item) => item.id === schedule.junta_id);
      if (!junta) return null;

      const juntaMembers = params.members.filter((member) => member.junta_id === junta.id);
      const receiver = getCurrentRoundReceiver({ schedule, members: juntaMembers });
      const receiverProfile = receiver ? params.profilesById[receiver.profile_id] : null;
      const receiverPayment = getReceiverPaymentDetails(receiverProfile);
      const myPaymentConfig = getReceiverPaymentDetails(params.profilesById[params.userId] ?? params.fallbackProfile);
      const userPayment = params.payments.find((payment) =>
        payment.profile_id === params.userId
        && payment.junta_id === junta.id
        && payment.schedule_id === schedule.id
      );

      const dueDate = parseCalendarDate(schedule.fecha_vencimiento);
      const status: PaymentDebtStatus = userPayment?.estado === 'approved'
        ? 'pagada'
        : dueDate.getTime() < now.getTime()
          ? 'vencida'
          : isSameDay(dueDate, now)
            ? 'vence_hoy'
            : 'pendiente';

      return {
        id: `${junta.id}:${schedule.id}`,
        juntaId: junta.id,
        juntaNombre: junta.nombre,
        cuotaId: schedule.id,
        cuotaNumero: schedule.cuota_numero,
        dueDate: schedule.fecha_vencimiento,
        monto: schedule.monto,
        receiverName: receiver ? getParticipantDisplayName(receiverProfile) : 'Receptor por definir',
        receiverId: receiver?.profile_id ?? null,
        receiverMethod: receiverPayment.methodLabel,
        receiverMethodConfigured: receiverPayment.isConfigured,
        myPayoutConfigured: myPaymentConfig.isConfigured,
        status
      } satisfies PaymentDebtItem;
    })
    .filter((item): item is PaymentDebtItem => Boolean(item))
    .sort((a, b) => parseCalendarDate(a.dueDate).getTime() - parseCalendarDate(b.dueDate).getTime());
}
