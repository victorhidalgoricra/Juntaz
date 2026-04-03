'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loginSchema } from '@/features/auth/schemas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof loginSchema>>();

  return (
    <Card className="w-full space-y-4">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit((values) => {
          const parsed = loginSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'email' | 'password', { message: issue.message });
            return;
          }

          setUser({
            id: crypto.randomUUID(),
            email: values.email,
            nombre: values.email.split('@')[0],
            celular: ''
          });
          router.push('/dashboard');
        })}
      >
        <Input placeholder="Correo" {...register('email')} />
        <Input placeholder="Contraseña" type="password" {...register('password')} />
        <Button className="w-full" type="submit">
          Entrar
        </Button>
        {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
        {formState.errors.password && <p className="text-xs text-red-500">{formState.errors.password.message}</p>}
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/register">Crear cuenta</Link>
        <Link href="/forgot-password">Recuperar clave</Link>
      </div>
    </Card>
  );
}
