'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/admin');
    else if (user.global_role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  if (!user || user.global_role !== 'admin') return null;

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8">{children}</div>;
}
