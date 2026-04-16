'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { resetPasswordSchema } from '@/features/auth/schemas';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { mapAuthErrorMessage } from '@/services/auth.service';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<z.infer<typeof resetPasswordSchema>>();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <Card className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>
        <p className="text-sm text-slate-500">Define una nueva contraseña segura para tu cuenta.</p>
      </div>

      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          setMessage(null);
          setErrorMessage(null);
          const parsed = resetPasswordSchema.safeParse(values);
          if (!parsed.success) {
            const issue = parsed.error.issues[0];
            setError(issue.path[0] as 'password' | 'confirmPassword', { message: issue.message });
            return;
          }

          try {
            setLoading(true);
            if (hasSupabase && supabase) {
              const { error } = await supabase.auth.updateUser({ password: values.password });
              if (error) throw error;
            }
            setMessage('Tu contraseña fue actualizada correctamente.');
            setTimeout(() => router.push('/login'), 1200);
          } catch (error) {
            console.error('[ResetPassword] update error', error);
            setErrorMessage(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No se pudo actualizar la contraseña.');
          } finally {
            setLoading(false);
          }
        })}
      >
        <label className="text-sm font-medium">Nueva contraseña</label>
        <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
        <label className="text-sm font-medium">Confirmar contraseña</label>
        <Input type="password" placeholder="Repite tu contraseña" {...register('confirmPassword')} />
        <Button className="w-full" disabled={loading}>{loading ? 'Guardando...' : 'Guardar nueva contraseña'}</Button>
      </form>

      {formState.errors.password && <p className="text-xs text-red-500">{formState.errors.password.message}</p>}
      {formState.errors.confirmPassword && <p className="text-xs text-red-500">{formState.errors.confirmPassword.message}</p>}
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      {message && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{message}</p>}

      <Link href="/login" className="text-sm">Volver a iniciar sesión</Link>
    </Card>
  );
}
