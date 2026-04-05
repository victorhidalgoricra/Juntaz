import { addDays, addMonths, format } from 'date-fns';
import { Frecuencia, IncentivoRegla, TipoJunta } from '@/types/domain';

type SimParams = {
  participantes: number;
  cuotaBase: number;
  frecuencia: Frecuencia;
  fechaInicio: string;
  tipoJunta: TipoJunta;
  incentivoPorcentaje?: number;
  incentivoRegla?: IncentivoRegla;
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

const round2 = (value: number) => Math.round(value * 100) / 100;

export function calcularSimulacionJunta(params: SimParams) {
  const n = Math.max(2, Number(params.participantes) || 2);
  const cuotaBase = round2(Math.max(0, Number(params.cuotaBase) || 0));
  const bolsaBase = round2(n * cuotaBase);
  const incentivoPorcentaje = params.tipoJunta === 'incentivo' ? round2(Math.max(0, Number(params.incentivoPorcentaje) || 0)) : 0;
  const porcentajeDecimal = incentivoPorcentaje / 100;
  const ajusteTotal = round2(bolsaBase * porcentajeDecimal);
  const ajusteCuotaPorRonda = round2(ajusteTotal / n);

  const start = new Date(params.fechaInicio);

  const rows: SimRow[] = Array.from({ length: n }).map((_, index) => {
    const turno = index + 1;
    const isPrimero = turno === 1;
    const isUltimo = turno === n;

    const date =
      params.frecuencia === 'semanal'
        ? addDays(start, index * 7)
        : params.frecuencia === 'quincenal'
          ? addDays(start, index * 14)
          : addMonths(start, index);

    let ajuste = 0;
    if (params.tipoJunta === 'incentivo' && (params.incentivoRegla ?? 'primero_ultimo') === 'primero_ultimo') {
      if (isPrimero) ajuste = -ajusteTotal;
      if (isUltimo) ajuste = ajusteTotal;
    }

    const cuotaPorRonda =
      params.tipoJunta === 'incentivo'
        ? round2(cuotaBase + (isPrimero ? ajusteCuotaPorRonda : isUltimo ? -ajusteCuotaPorRonda : 0))
        : cuotaBase;

    const montoRecibido = round2(bolsaBase + ajuste);
    const totalAportadoCiclo = round2(cuotaPorRonda * n);
    const neto = round2(montoRecibido - totalAportadoCiclo);
    const perfil = isPrimero ? 'Liquidez inmediata' : isUltimo ? 'Prefiere mayor beneficio final' : 'Balance intermedio';

    return {
      turno,
      fechaRonda: format(date, 'yyyy-MM-dd'),
      cuotaPorRonda,
      totalAportadoCiclo,
      montoRecibido,
      ajuste,
      neto,
      perfil
    };
  });

  const totalAportes = round2(rows.reduce((acc, row) => acc + row.totalAportadoCiclo, 0));
  const totalRecibido = round2(rows.reduce((acc, row) => acc + row.montoRecibido, 0));
  const balance = round2(totalRecibido - totalAportes);

  return {
    rows,
    bolsaBase,
    ajusteTotal,
    incentivoPorcentaje,
    cuotaBase,
    totalAportes,
    totalRecibido,
    balance
  };
}
