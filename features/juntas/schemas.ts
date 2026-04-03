import { z } from 'zod';

export const createJuntaSchema = z.object({
  nombre: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  moneda: z.enum(['PEN', 'USD']),
  participantes_max: z.coerce.number().min(2, 'Mínimo 2 participantes'),
  monto_cuota: z.coerce.number().positive('Monto debe ser mayor a cero'),
  frecuencia_pago: z.enum(['semanal', 'quincenal', 'mensual']),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  dia_limite_pago: z.coerce.number().min(1).max(31),
  premio_primero_pct: z.coerce.number().min(0).max(100),
  descuento_ultimo_pct: z.coerce.number().min(0).max(100),
  fee_plataforma_pct: z.coerce.number().min(0).max(100),
  penalidad_mora: z.coerce.number().min(0).optional(),
  visibilidad: z.enum(['privada', 'invitacion']),
  cerrar_inscripciones: z.boolean()
});
