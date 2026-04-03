import { Junta } from '@/types/domain';

export function validarActivacionJunta(totalMiembros: number) {
  if (totalMiembros < 2) {
    throw new Error('No se puede activar una junta con menos de 2 integrantes.');
  }
}

export function calcularPozo(junta: Junta) {
  return junta.monto_cuota * junta.participantes_max;
}
