import { z } from 'zod';
import { normalizeDni, normalizePhone } from '@/lib/profile-normalization';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
});

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  dni: z.string().transform((value) => normalizeDni(value)).refine((value) => /^\d{8}$/.test(value), 'Ingresa un DNI válido de 8 dígitos'),
  celular: z.string().transform((value) => normalizePhone(value)).refine((value) => /^\d{9,11}$/.test(value), 'Ingresa un celular válido (solo números, 9 a 11 dígitos)'),
  email: z.string().trim().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido')
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'La confirmación debe tener al menos 8 caracteres')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  });
