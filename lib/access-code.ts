export function generateAccessCode(prefix: 'JNT' | 'PRIV' = 'PRIV') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomPart = Array.from({ length: 4 })
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('');

  return `${prefix}-${randomPart}`;
}
