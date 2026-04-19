import { addFrequencyToDate } from '@/lib/calendar-date';
import { Frecuencia, TipoJunta } from '@/types/domain';

type SimParams = {
  participantes: number;
  cuotaBase: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  tipoJunta: TipoJunta;
  incentivoPorcentaje?: number;
  incentivoPorTurno?: number[];
};

export type SimRow = {
  turno: number;
  fechaRonda: string;
  cuotaPorRonda: number;
  totalAportadoCiclo: number;
  montoRecibido: number;
  ajuste: number;
  neto: number;
  perfil: string;
};

export type IncentivePreviewRow = {
  turno: number;
  ajustePorcentaje: number;
  cuotaFinal: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function generateTurnIncentives(totalParticipants: number, firstHalfPercentages: number[]) {
  const n = Math.max(1, Math.floor(totalParticipants));
  const half = Math.floor(n / 2);
  const positives = Array.from({ length: half }, (_, index) => Math.max(0, Number(firstHalfPercentages[index] ?? 0)));

  return Array.from({ length: n }, (_, index) => {
    if (index < half) return positives[index];
    if (n % 2 === 1 && index === half) return 0;

    const mirrorIndex = n - 1 - index;
    return -positives[mirrorIndex];
  });
}

export function calculateContributionByTurn(baseContribution: number, incentives: number[]) {
  const base = round2(Math.max(0, Number(baseContribution) || 0));
  return incentives.map((percent) => round2(base * (1 + percent / 100)));
}

export function getIncentivePreviewRows(params: {
  totalParticipants: number;
  baseContribution: number;
  firstHalfPercentages: number[];
}): IncentivePreviewRow[] {
  const incentives = generateTurnIncentives(params.totalParticipants, params.firstHalfPercentages);
  const contributions = calculateContributionByTurn(params.baseContribution, incentives);

  return incentives.map((incentive, index) => ({
    turno: index + 1,
    ajustePorcentaje: incentive,
    cuotaFinal: contributions[index]
  }));
}

function getTurnProfile(turn: number, totalTurns: number) {
  if (turn === 1) return 'Liquidez inmediata';
  if (turn <= Math.floor(totalTurns / 2)) return 'Recibe temprano';
  if (totalTurns % 2 === 1 && turn === Math.ceil(totalTurns / 2)) return 'Punto medio';
  if (turn === totalTurns) return 'Prefiere mayor espera';
  return 'Espera moderada';
}

export function calcularSimulacionJunta(params: SimParams) {
  const n = Math.max(2, Number(params.participantes) || 2);
  const cuotaBase = round2(Math.max(0, Number(params.cuotaBase) || 0));
  const bolsaBase = round2(n * cuotaBase);
  const fallbackIncentive = round2(Math.max(0, Number(params.incentivoPorcentaje) || 0));
  const firstHalfFallback = Array.from({ length: Math.floor(n / 2) }, () => fallbackIncentive);

  const turnIncentives = params.tipoJunta === 'incentivo'
    ? generateTurnIncentives(n, params.incentivoPorTurno?.length ? params.incentivoPorTurno : firstHalfFallback)
    : Array.from({ length: n }, () => 0);

  const contributions = calculateContributionByTurn(cuotaBase, turnIncentives);

  const rows: SimRow[] = Array.from({ length: n }).map((_, index) => {
    const turno = index + 1;
    const date = addFrequencyToDate(params.fechaInicio, params.frecuencia, index);

    const cuotaPorRonda = contributions[index] ?? cuotaBase;
    const ajuste = round2(cuotaPorRonda - cuotaBase);
    const montoRecibido = bolsaBase;
    const totalAportadoCiclo = round2(cuotaPorRonda * n);
    const neto = round2(montoRecibido - totalAportadoCiclo);

    return {
      turno,
      fechaRonda: date,
      cuotaPorRonda,
      totalAportadoCiclo,
      montoRecibido,
      ajuste,
      neto,
      perfil: getTurnProfile(turno, n)
    };
  });

  const totalAportes = round2(rows.reduce((acc, row) => acc + row.totalAportadoCiclo, 0));
  const totalRecibido = round2(rows.reduce((acc, row) => acc + row.montoRecibido, 0));
  const balance = round2(totalRecibido - totalAportes);
  const ajusteTotal = round2(rows.reduce((acc, row) => acc + row.ajuste, 0));

  return {
    rows,
    bolsaBase,
    ajusteTotal,
    incentivoPorcentaje: fallbackIncentive,
    cuotaBase,
    totalAportes,
    totalRecibido,
    balance,
    incentivosPorTurno: turnIncentives
  };
}
