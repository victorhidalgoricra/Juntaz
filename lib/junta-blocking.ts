import { Junta } from '@/types/domain';

const APP_TIMEZONE = 'America/Lima';

function getCurrentDateInAppTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  return new Date(`${parts}T00:00:00`);
}

export function isJuntaBlockedByDeadline(junta: Pick<Junta, 'estado' | 'fecha_inicio' | 'bloqueada'>) {
  if (junta.bloqueada) return true;
  if (junta.estado !== 'borrador' || !junta.fecha_inicio) return false;
  const today = getCurrentDateInAppTz();
  const firstPaymentDate = new Date(`${junta.fecha_inicio}T00:00:00`);
  return today.getTime() > firstPaymentDate.getTime();
}

export const APP_BUSINESS_TIMEZONE = APP_TIMEZONE;
