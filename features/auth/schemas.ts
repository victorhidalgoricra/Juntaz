import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres')
});

export const registerSchema = z.object({
  nombre: z.string().min(3),
  celular: z.string().min(9),
  email: z.string().email(),
  password: z.string().min(6)
});
