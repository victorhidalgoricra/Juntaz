'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/juntas/new', label: 'Crear junta' },
  { href: '/notifications', label: 'Notificaciones' },
  { href: '/profile', label: 'Perfil' },
  { href: '/settings', label: 'Configuración' }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-white p-4 md:min-h-screen md:border-r md:border-b-0">
        <p className="mb-4 text-lg font-semibold text-primary">Juntas Digitales</p>
        <nav className="flex gap-2 overflow-auto md:flex-col">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm',
                pathname === link.href ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
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
