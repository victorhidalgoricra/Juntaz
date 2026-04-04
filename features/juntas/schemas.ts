import { z } from 'zod';

export const createJuntaSchema = z.object({
  nombre: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  participantes_max: z.coerce.number().min(2, 'El tamaño del grupo debe ser mayor a 1'),
  monto_cuota: z.coerce.number().positive('El aporte debe ser mayor a 0'),
  frecuencia_pago: z.enum(['semanal', 'quincenal', 'mensual']),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  visibilidad: z.enum(['publica', 'privada'])
});
