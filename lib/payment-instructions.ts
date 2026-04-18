import { JuntaMember, PaymentSchedule, Profile } from '@/types/domain';

export type ReceiverPaymentDetails = {
  methodLabel: string;
  destinationLabel: string | null;
  destinationValue: string | null;
  secondaryLabel: string | null;
  secondaryValue: string | null;
  notes: string | null;
  isConfigured: boolean;
};

export function getParticipantDisplayName(profile?: Partial<Profile> | null) {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!profile) return 'Usuario sin nombre';

  const first = (profile.first_name ?? '').trim();
  const second = (profile.second_name ?? '').trim();
  const paternal = (profile.paternal_last_name ?? '').trim();
  const byParts = [first, second, paternal].filter(Boolean).join(' ').trim();
  if (byParts) return byParts;

  const fullName = (profile.nombre ?? '').trim();
  if (fullName && !uuidLike.test(fullName)) return fullName;

  const email = (profile.email ?? '').trim();
  if (email) {
    const [local] = email.split('@');
    return local ? `${local.slice(0, 2)}***` : 'Usuario sin nombre';
  }

  const phone = (profile.celular ?? '').replace(/\D/g, '');
  if (phone.length >= 4) return `***${phone.slice(-4)}`;

  return 'Usuario sin nombre';
}

export function getReceiverPaymentDetails(profile?: Partial<Profile> | null): ReceiverPaymentDetails {
  const method = profile?.preferred_payout_method;
  const accountName = profile?.payout_account_name?.trim() || null;
  const payoutPhone = profile?.payout_phone_number?.trim() || null;
  const bankName = profile?.payout_bank_name?.trim() || null;
  const accountNumber = profile?.payout_account_number?.trim() || null;
  const cci = profile?.payout_cci?.trim() || null;
  const notes = profile?.payout_notes?.trim() || null;

  if (!method) {
    return {
      methodLabel: 'Sin método configurado',
      destinationLabel: null,
      destinationValue: null,
      secondaryLabel: null,
      secondaryValue: null,
      notes,
      isConfigured: false
    };
  }

  if (method === 'yape' || method === 'plin') {
    return {
      methodLabel: method === 'yape' ? 'Yape' : 'Plin',
      destinationLabel: `${method === 'yape' ? 'Yape' : 'Plin'} / celular`,
      destinationValue: payoutPhone,
      secondaryLabel: accountName ? 'Titular' : null,
      secondaryValue: accountName,
      notes,
      isConfigured: Boolean(payoutPhone)
    };
  }

  if (method === 'bank_account') {
    return {
      methodLabel: `Cuenta bancaria${bankName ? ` (${bankName})` : ''}`,
      destinationLabel: 'N° de cuenta',
      destinationValue: accountNumber,
      secondaryLabel: cci ? 'CCI' : null,
      secondaryValue: cci,
      notes,
      isConfigured: Boolean(accountNumber || cci)
    };
  }

  if (method === 'cash') {
    return {
      methodLabel: 'Efectivo',
      destinationLabel: 'Entrega',
      destinationValue: 'Coordinación presencial',
      secondaryLabel: accountName ? 'Contacto' : null,
      secondaryValue: accountName,
      notes,
      isConfigured: true
    };
  }

  return {
    methodLabel: 'Otro medio',
    destinationLabel: accountName ? 'Referencia' : null,
    destinationValue: accountName,
    secondaryLabel: null,
    secondaryValue: null,
    notes,
    isConfigured: Boolean(accountName || notes)
  };
}

export function getCurrentRoundReceiver(params: {
  schedule?: PaymentSchedule | null;
  members: JuntaMember[];
}) {
  if (!params.schedule) return null;

  const activeMembers = params.members
    .filter((member) => member.estado === 'activo')
    .sort((a, b) => a.orden_turno - b.orden_turno);

  if (activeMembers.length === 0) return null;

  const roundIndex = (params.schedule.cuota_numero - 1) % activeMembers.length;
  return activeMembers[roundIndex] ?? null;
}
