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
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hasSupabase } from '@/lib/env';
import { mapAuthErrorMessage } from '@/services/auth.service';
import { ensureProfileExists, fetchProfileById } from '@/services/profile.service';

type LoginFormValues = z.infer<typeof loginSchema>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500">{message}</p>;
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const confirmedParam = searchParams.get('confirmed');
  const signupParam = searchParams.get('signup');
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, formState, setError } = useForm<LoginFormValues>();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmedMsg = useMemo(() => (confirmedParam ? 'Tu correo fue confirmado. Ya puedes iniciar sesión.' : null), [confirmedParam]);
  const signupMsg = useMemo(() => {
    if (signupParam === 'confirm_email') {
      return 'Te enviamos un correo de confirmación. Revisa tu bandeja de entrada antes de ingresar.';
    }
    if (signupParam === 'success') {
      return 'Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.';
    }
    return null;
  }, [signupParam]);

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue.path[0] as 'email' | 'password', { message: issue.message });
      return;
    }

    try {
      setLoading(true);
      if (hasSupabase && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
        if (error) throw error;
        const user = data.user;
        if (!user) throw new Error('No se pudo obtener sesión.');

        const globalRole = await resolveGlobalRole(values.email);
        const profileResult = await fetchProfileById(user.id);
        if (!profileResult.ok) throw new Error(profileResult.message);
        if (!profileResult.data) {
          const ensureResult = await ensureProfileExists({
            id: user.id,
            email: values.email,
            nombre: user.user_metadata?.full_name ?? values.email.split('@')[0],
            celular: user.user_metadata?.phone ?? '000000000',
            dni: user.user_metadata?.dni
          });
          if (!ensureResult.ok) throw new Error(ensureResult.message);
        }
        let refreshedProfile = profileResult.data;
        if (!refreshedProfile) {
          const retryProfile = await fetchProfileById(user.id);
          if (!retryProfile.ok) throw new Error(retryProfile.message);
          refreshedProfile = retryProfile.data;
        }
        setUser({
          id: user.id,
          email: refreshedProfile?.email ?? values.email,
          nombre: refreshedProfile?.nombre ?? user.user_metadata?.full_name ?? values.email.split('@')[0],
          first_name: refreshedProfile?.first_name,
          second_name: refreshedProfile?.second_name,
          paternal_last_name: refreshedProfile?.paternal_last_name,
          celular: refreshedProfile?.celular ?? user.user_metadata?.phone ?? '000000000',
          dni: refreshedProfile?.dni,
          foto_url: refreshedProfile?.foto_url,
          preferred_payout_method: refreshedProfile?.preferred_payout_method,
          payout_account_name: refreshedProfile?.payout_account_name,
          payout_phone_number: refreshedProfile?.payout_phone_number,
          payout_bank_name: refreshedProfile?.payout_bank_name,
          payout_account_number: refreshedProfile?.payout_account_number,
          payout_cci: refreshedProfile?.payout_cci,
          payout_notes: refreshedProfile?.payout_notes,
          global_role: globalRole
        });
        router.push(redirect);
        return;
      }

      const globalRole = await resolveGlobalRole(values.email);
      setUser({ id: crypto.randomUUID(), email: values.email, nombre: values.email.split('@')[0], celular: '', global_role: globalRole });
      router.push(redirect);
    } catch (error) {
      console.error('[Login] auth error', error);
      setAuthError(error instanceof Error ? mapAuthErrorMessage(error.message) : 'No se pudo iniciar sesión en este momento.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Card className="w-full max-w-md space-y-5 p-6 sm:p-7">
      <div className="space-y-1 text-left">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="text-sm text-slate-500">Ingresa para gestionar tus juntas de forma segura.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Correo</label>
          <Input placeholder="correo@ejemplo.com" autoComplete="email" {...register('email')} />
          <FieldError message={formState.errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Contraseña</label>
          <Input placeholder="Tu contraseña" type="password" autoComplete="current-password" {...register('password')} />
          <FieldError message={formState.errors.password?.message} />
        </div>

        {authError && <FieldError message={authError} />}
        {signupMsg && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{signupMsg}</p>}
        {confirmedMsg && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">{confirmedMsg}</p>}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Entrar'}
        </Button>

        <div className="flex flex-col gap-2 pt-1 text-sm">
          <Link className="text-slate-700 hover:text-slate-900 hover:underline" href={`/register?redirect=${encodeURIComponent(redirect)}`}>
            Crear cuenta
          </Link>
          <Link className="text-slate-700 hover:text-slate-900 hover:underline" href="/forgot-password">
            Olvidé mi contraseña
          </Link>
        </div>
      </form>
    </Card>
  );
}
