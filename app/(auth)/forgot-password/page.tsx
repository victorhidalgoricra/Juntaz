'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { forgotPasswordSchema } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { mapAuthErrorMessage } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof forgotPasswordSchema>>();
  const [loadingReset, setLoadingReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <Card className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-slate-500">Ingresa tu correo para enviarte instrucciones de restablecimiento.</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          setMessage(null);
          setErrorMessage(null);

          const parsed = forgotPasswordSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'email', { message: issue.message });
            return;
          }

          try {
            setLoadingReset(true);
            if (hasSupabase && supabase) {
              const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/reset-password`
              });
              if (error) throw error;
            }

            setMessage('Si el correo existe, te enviamos instrucciones para restablecer tu contraseña.');
          } catch (error) {
            console.error('[ForgotPassword] reset flow error', error);
            setErrorMessage(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No pudimos iniciar la recuperación.');
          } finally {
            setLoadingReset(false);
          }
        })}
      >
        <label className="text-sm font-medium">Correo</label>
        <Input placeholder="correo@ejemplo.com" {...register('email')} />
        <Button disabled={loadingReset} className="w-full">{loadingReset ? 'Enviando...' : 'Recuperar contraseña'}</Button>
      </form>

      {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      {message && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{message}</p>}

      <Link href="/login" className="text-sm">Volver a iniciar sesión</Link>
    </Card>
  );
}
