'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="space-y-3 rounded-lg border bg-white p-6 text-center">
          <p>Debes iniciar sesión para continuar.</p>
          <Button onClick={() => router.push('/login')}>Ir a login</Button>
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
          onClick={() => {
            setUser(null);
            router.push('/login');
          }}
        >
          Cerrar sesión
        </Button>
      </div>
      {children}
    </AppShell>
  );
}
