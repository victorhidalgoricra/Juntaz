import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm', props.className)} />;
}
