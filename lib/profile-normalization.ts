export function normalizeDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

export function normalizeDni(value: string | null | undefined) {
  return normalizeDigits(value);
}

export function normalizePhone(value: string | null | undefined) {
  return normalizeDigits(value);
}
