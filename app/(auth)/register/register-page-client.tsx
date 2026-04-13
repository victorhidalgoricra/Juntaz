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
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { mapAuthErrorMessage } from '@/services/auth.service';
import { useState } from 'react';
import { checkProfileConflicts } from '@/services/profile.service';

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof registerSchema>>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Crea tu cuenta</h1>
        <p className="text-sm text-slate-500">Regístrate para crear y unirte a juntas digitales.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          setAuthError(null);
          setSuccessMsg(null);
          const parsed = registerSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'nombre' | 'dni' | 'celular' | 'email' | 'password', { message: issue.message });
            return;
          }

          try {
            setLoading(true);
            if (hasSupabase && supabase) {
              const conflictCheck = await checkProfileConflicts({ dni: values.dni, celular: values.celular });
              if (!conflictCheck.ok) throw new Error(conflictCheck.message);
              if (conflictCheck.existsDni) {
                setError('dni', { message: 'Este DNI ya está registrado.' });
                return;
              }
              if (conflictCheck.existsCelular) {
                setError('celular', { message: 'Este celular ya está registrado.' });
                return;
              }

              const emailRedirectTo = `${window.location.origin}/login?confirmed=1`;
              const { data, error } = await supabase.auth.signUp({
                email: values.email,
                password: values.password,
                options: {
                  data: { full_name: values.nombre, phone: values.celular, dni: values.dni },
                  emailRedirectTo
                }
              });
              if (error) throw error;

              const user = data.user;

              if (user && (user.identities ?? []).length === 0) {
                setAuthError('Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.');
                return;
              }

              setSuccessMsg('Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada y spam.');
              return;
            }

            setUser({ id: crypto.randomUUID(), ...values, global_role: 'user' });
            router.push(redirect);
          } catch (error) {
            console.error('[Register] auth error', error);
            setAuthError(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No pudimos completar tu registro.');
          } finally {
            setLoading(false);
          }
        })}
      >
        <label className="text-sm font-medium">Nombre completo</label>
        <Input placeholder="Nombre y apellido" {...register('nombre')} />
        <label className="text-sm font-medium">DNI</label>
        <Input placeholder="12345678" {...register('dni')} />
        <label className="text-sm font-medium">Celular</label>
        <Input placeholder="987654321" {...register('celular')} />
        <label className="text-sm font-medium">Correo</label>
        <Input placeholder="correo@ejemplo.com" {...register('email')} />
        <label className="text-sm font-medium">Contraseña</label>
        <Input placeholder="Mínimo 8 caracteres" type="password" {...register('password')} />
        <Button className="w-full" disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Button>
      </form>
      {formState.errors.nombre && <p className="text-xs text-red-500">{formState.errors.nombre.message}</p>}
      {formState.errors.dni && <p className="text-xs text-red-500">{formState.errors.dni.message}</p>}
      {formState.errors.celular && <p className="text-xs text-red-500">{formState.errors.celular.message}</p>}
      {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
      {formState.errors.password && <p className="text-xs text-red-500">{formState.errors.password.message}</p>}
      {authError && <p className="text-xs text-red-500">{authError}</p>}
      {successMsg && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{successMsg}</p>}
      <Link className="text-sm" href={`/login?redirect=${encodeURIComponent(redirect)}`}>
        Ya tengo cuenta
      </Link>
    </Card>
  );
}
