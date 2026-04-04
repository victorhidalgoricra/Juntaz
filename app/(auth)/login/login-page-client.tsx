'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loginSchema } from '@/features/auth/schemas';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { resolveGlobalRole } from '@/services/auth-role.service';
import { useState } from 'react';
import { ensureProfileExists } from '@/services/profile.service';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, formState, setError } = useForm<z.infer<typeof loginSchema>>();
  const [authError, setAuthError] = useState<string | null>(null);

  return (
    <Card className="w-full space-y-4">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          setAuthError(null);
          const parsed = loginSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'email' | 'password', { message: issue.message });
            return;
          }

          try {
            if (hasSupabase && supabase) {
              const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
              if (error) throw error;
              const user = data.user;
              if (!user) throw new Error('No se pudo obtener sesión.');

              const profileResult = await ensureProfileExists({
                id: user.id,
                email: values.email,
                nombre: user.user_metadata?.full_name ?? values.email.split('@')[0]
              });
              if (!profileResult.ok) throw new Error(profileResult.message);

              const globalRole = await resolveGlobalRole(values.email);
              setUser({ id: user.id, email: values.email, nombre: user.user_metadata?.full_name ?? values.email.split('@')[0], celular: '000000000', global_role: globalRole });
              router.push(redirect);
              return;
            }

            const globalRole = await resolveGlobalRole(values.email);
            setUser({ id: crypto.randomUUID(), email: values.email, nombre: values.email.split('@')[0], celular: '', global_role: globalRole });
            router.push(redirect);
          } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'No se pudo iniciar sesión en este momento. Intenta nuevamente.');
          }
        })}
      >
        <Input placeholder="Correo" {...register('email')} />
        <Input placeholder="Contraseña" type="password" {...register('password')} />
        <Button className="w-full" type="submit">
          Entrar
        </Button>
        {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
        {formState.errors.password && <p className="text-xs text-red-500">{formState.errors.password.message}</p>}
        {authError && <p className="text-xs text-red-500">{authError}</p>}
      </form>
      <div className="flex justify-between text-sm">
        <Link href={`/register?redirect=${encodeURIComponent(redirect)}`}>Crear cuenta</Link>
        <Link href="/forgot-password">Recuperar clave</Link>
      </div>
    </Card>
  );
}
