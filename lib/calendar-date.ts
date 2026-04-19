import type { Frecuencia } from '@/types/domain';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string) {
  return DATE_ONLY_REGEX.test(value);
}

function parseDateOnlyParts(value: string) {
  if (!isDateOnly(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDateOnlyString(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseCalendarDate(value: string) {
  const parts = parseDateOnlyParts(value);
  if (parts) {
    // 12:00 UTC evita bordes de timezone/DST al proyectar solo fecha calendario.
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0));
  }
  return new Date(value);
}

export function formatCalendarDate(value: string, locale = 'es-PE') {
  const parts = parseDateOnlyParts(value);
  if (parts) {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0)));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale).format(parsed);
}

export function addFrequencyToDate(startDate: string, frecuencia: Frecuencia, turnIndex: number) {
  const parts = parseDateOnlyParts(startDate);
  if (!parts) return startDate;

  if (frecuencia === 'mensual') {
    const totalMonths = (parts.month - 1) + turnIndex;
    const year = parts.year + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const day = Math.min(parts.day, daysInMonth(year, month));
    return toDateOnlyString({ year, month, day });
  }

  const daysOffset = frecuencia === 'quincenal' ? turnIndex * 14 : turnIndex * 7;
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0));
  base.setUTCDate(base.getUTCDate() + daysOffset);

  return toDateOnlyString({
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate()
  });
}
