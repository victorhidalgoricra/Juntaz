import { z } from 'zod';

export const createJuntaSchema = z.object({
  nombre: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  participantes_max: z.coerce.number().min(2, 'El tamaño del grupo debe ser mayor a 1'),
  monto_cuota: z.coerce.number().positive('El aporte debe ser mayor a 0'),
  tipo_junta: z.enum(['normal', 'incentivo']),
  incentivo_porcentaje: z.coerce.number().min(0, 'El incentivo no puede ser negativo').optional(),
  incentivo_regla: z.enum(['primero_ultimo', 'escalonado']).optional(),
  frecuencia_pago: z.enum(['semanal', 'quincenal', 'mensual']),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  visibilidad: z.enum(['publica', 'privada'])
}).superRefine((data, ctx) => {
  if (data.tipo_junta === 'incentivo' && (data.incentivo_porcentaje ?? 0) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['incentivo_porcentaje'],
      message: 'Para juntas con incentivos debes indicar un porcentaje mayor a 0'
    });
  }
});
