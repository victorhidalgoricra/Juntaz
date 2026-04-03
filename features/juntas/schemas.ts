import { z } from 'zod';

export const createJuntaSchema = z.object({
  nombre: z.string().min(3),
  descripcion: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']),
  participantes_max: z.coerce.number().min(2),
  monto_cuota: z.coerce.number().positive(),
  frecuencia_pago: z.enum(['semanal', 'quincenal', 'mensual']),
  fecha_inicio: z.string().min(1),
  dia_limite_pago: z.coerce.number().min(1).max(31),
  penalidad_mora: z.coerce.number().min(0).optional(),
  visibilidad: z.enum(['privada', 'invitacion']),
  cerrar_inscripciones: z.boolean()
});
