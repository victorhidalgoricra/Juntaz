'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const setData = useAppStore((s) => s.setData);

  useEffect(() => {
    if (!user) {
      const redirect = pathname || '/dashboard';
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [user, router, pathname]);

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
            if (hasSupabase && supabase) await supabase.auth.signOut();
            setUser(null);
            setData({ juntas: [], members: [], schedules: [], payments: [], payouts: [], notifications: [] });
            router.push('/');
          }}
        >
          Cerrar sesión
        </Button>
      </div>
      {children}
    </AppShell>
  );
}
