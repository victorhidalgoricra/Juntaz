export function getAvatarColor(seed: string) {
  const palette = [
    'bg-rose-100 text-rose-700',
    'bg-sky-100 text-sky-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-cyan-100 text-cyan-700'
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function formatIncentiveLabel(params: { tipoJunta?: string; incentivoPorcentaje?: number; incentivoRegla?: string }) {
  const pct = Number(params.incentivoPorcentaje ?? 0);
  if (params.tipoJunta !== 'incentivo' || pct <= 0) return 'Sin incentivo activo';
  if (params.incentivoRegla === 'escalonado') return `Incentivo escalonado · base ${pct}%`;
  return `+${pct}% primero / -${pct}% último`;
}
