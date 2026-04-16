import { Junta } from '@/types/domain';

export function validarActivacionJunta(totalMiembrosActivos: number, integrantesRequeridos: number) {
  if (totalMiembrosActivos < integrantesRequeridos) {
    throw new Error('Completa todos los integrantes para activar la junta.');
  }
}

export function calcularPozo(junta: Junta) {
  return junta.monto_cuota * junta.participantes_max;
}
