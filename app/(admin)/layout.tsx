'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { useAuthStore } from '@/store/auth-store';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const hasBackofficeAccess = isBackofficeAdmin(user);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Backoffice guard]', {
        pathname,
        userId: user?.id ?? null,
        role: user?.global_role ?? null,
        hasBackofficeAccess
      });
    }

    if (!user) {
      router.replace('/login?redirect=/admin');
      return;
    }

    if (!hasBackofficeAccess) router.replace('/dashboard');
  }, [hasBackofficeAccess, pathname, router, user]);

  if (!user || !hasBackofficeAccess) return null;

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8">{children}</div>;
}
