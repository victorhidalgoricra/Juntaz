'use client';

import Link from 'next/link';
import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { isBackofficeAdmin } from '@/services/auth-role.service';

type NavItem = {
  href: string;
  label: string;
  requiresBackoffice?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pagar', label: 'Pagar' },
  { href: '/juntas', label: 'Juntas disponibles' },
  { href: '/juntas/new', label: 'Crear junta' },
  { href: '/account', label: 'Mi cuenta' },
  { href: '/admin', label: 'Backoffice', requiresBackoffice: true }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const canAccessBackoffice = isBackofficeAdmin(user);
  const isAccountSection = pathname.startsWith('/account') || pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/notifications');

  const links = useMemo(
    () => NAV_ITEMS.filter((item) => !item.requiresBackoffice || canAccessBackoffice),
    [canAccessBackoffice]
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b bg-white p-4 md:min-h-screen md:border-r md:border-b-0">
        <p className="mb-4 text-lg font-semibold text-primary">Juntas Digitales</p>
        {process.env.NODE_ENV === 'development' && (
          <p className="mb-2 text-xs text-slate-500">Rol sesión: {user?.global_role ?? 'user'}</p>
        )}
        <nav className="flex gap-2 overflow-auto md:flex-col">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm',
                (pathname === link.href || (link.href === '/account' && isAccountSection) || (link.href === '/admin' && pathname.startsWith('/admin')))
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
