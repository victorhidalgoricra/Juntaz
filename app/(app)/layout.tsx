'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import { fetchProfileById } from '@/services/profile.service';
import { resolveGlobalRole } from '@/services/auth-role.service';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const setData = useAppStore((s) => s.setData);

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async () => {
      if (user) return;

      if (hasSupabase && supabase) {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser && mounted) {
          const profile = await fetchProfileById(sessionUser.id);
          const globalRole = await resolveGlobalRole(sessionUser.email ?? '');
          setUser({
            id: sessionUser.id,
            email: profile.ok && profile.data?.email ? profile.data.email : (sessionUser.email ?? ''),
            nombre: profile.ok && profile.data?.nombre ? profile.data.nombre : (sessionUser.user_metadata?.full_name ?? 'Usuario'),
            first_name: profile.ok ? profile.data?.first_name : undefined,
            second_name: profile.ok ? profile.data?.second_name : undefined,
            paternal_last_name: profile.ok ? profile.data?.paternal_last_name : undefined,
            celular: profile.ok && profile.data?.celular ? profile.data.celular : (sessionUser.user_metadata?.phone ?? ''),
            dni: profile.ok ? profile.data?.dni : undefined,
            foto_url: profile.ok ? profile.data?.foto_url : undefined,
            preferred_payout_method: profile.ok ? profile.data?.preferred_payout_method : undefined,
            payout_account_name: profile.ok ? profile.data?.payout_account_name : undefined,
            payout_phone_number: profile.ok ? profile.data?.payout_phone_number : undefined,
            payout_bank_name: profile.ok ? profile.data?.payout_bank_name : undefined,
            payout_account_number: profile.ok ? profile.data?.payout_account_number : undefined,
            payout_cci: profile.ok ? profile.data?.payout_cci : undefined,
            payout_notes: profile.ok ? profile.data?.payout_notes : undefined,
            global_role: globalRole
          });
          return;
        }
      }

      if (mounted) {
        const redirect = pathname || '/dashboard';
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
      }
    };

    syncFromSession();
    return () => {
      mounted = false;
    };
  }, [user, router, pathname, setUser]);

  useEffect(() => {
    if (!user?.id) return;

    fetchUserJuntaSnapshot(user.id).then((result) => {
      if (!result.ok) return;
      setData({
        juntas: result.data.juntas,
        members: result.data.members,
        schedules: result.data.schedules,
        payments: result.data.payments,
        payouts: result.data.payouts
      });
    });
  }, [setData, user?.id]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-lg border bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Redirigiendo a login...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hola, {user.nombre}</p>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (hasSupabase && supabase) await supabase.auth.signOut();
            } finally {
              setUser(null);
              setData({ juntas: [], members: [], schedules: [], payments: [], payouts: [], notifications: [] });
              router.replace('/');
            }
          }}
        >
          Cerrar sesión
        </Button>
      </div>
      {children}
    </AppShell>
  );
}
