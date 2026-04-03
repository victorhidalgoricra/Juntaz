'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    if (!user) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [user, router, pathname]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hola, {user.nombre}</p>
        <Button
          variant="outline"
          onClick={() => {
            setUser(null);
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
