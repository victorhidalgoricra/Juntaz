import { EstadoJunta } from '@/types/domain';

export function isJuntaActive(estado: EstadoJunta | null | undefined) {
  return estado === 'activa';
}
