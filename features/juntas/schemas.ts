import { z } from 'zod';

export const createJuntaSchema = z.object({
  nombre: z.string().trim().min(1, 'Nombre requerido').max(40, 'Máximo 40 caracteres'),
  descripcion: z.string().optional(),
  participantes_max: z.coerce.number().int('El tamaño debe ser entero').min(4, 'Mínimo 4 integrantes').max(20, 'Máximo 20 integrantes'),
  monto_cuota: z.coerce.number().min(20, 'La cuota base mínima es S/20'),
  tipo_junta: z.enum(['normal', 'incentivo']),
  incentivo_porcentaje: z.coerce.number().min(0, 'El incentivo no puede ser negativo').optional(),
  incentivo_regla: z.enum(['primero_ultimo', 'escalonado']).optional(),
  frecuencia_pago: z.enum(['semanal', 'quincenal', 'mensual']),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  visibilidad: z.enum(['publica', 'privada'])
});
