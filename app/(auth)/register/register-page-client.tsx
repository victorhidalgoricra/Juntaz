'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { registerSchema } from '@/features/auth/schemas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof registerSchema>>();

  return (
    <Card className="w-full space-y-4">
      <h1 className="text-xl font-semibold">Registro</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit((values) => {
          const parsed = registerSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'nombre' | 'celular' | 'email' | 'password', { message: issue.message });
            return;
          }
          setUser({ id: crypto.randomUUID(), ...values, global_role: 'user' });
          router.push(redirect);
        })}
      >
        <Input placeholder="Nombre completo" {...register('nombre')} />
        <Input placeholder="Celular" {...register('celular')} />
        <Input placeholder="Correo" {...register('email')} />
        <Input placeholder="Contraseña" type="password" {...register('password')} />
        <Button className="w-full">Crear cuenta</Button>
      </form>
      {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
      <Link className="text-sm" href={`/login?redirect=${encodeURIComponent(redirect)}`}>
        Ya tengo cuenta
      </Link>
    </Card>
  );
}
