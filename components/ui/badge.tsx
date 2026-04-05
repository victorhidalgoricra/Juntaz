import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  pagada: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
  moroso: 'bg-red-100 text-red-700',
  activo: 'bg-blue-100 text-blue-700',
  invitado: 'bg-slate-200 text-slate-700'
};

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const content = String(children).toLowerCase();
  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', styles[content] ?? 'bg-slate-100', className)} {...props}>
      {children}
    </span>
  );
}
