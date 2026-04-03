import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  default: 'bg-primary text-white hover:opacity-90',
  outline: 'border border-slate-300 bg-white hover:bg-slate-100',
  ghost: 'bg-transparent hover:bg-slate-100',
  destructive: 'bg-destructive text-white hover:opacity-90'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn('rounded-md px-4 py-2 text-sm font-medium transition', variants[variant], className)}
      {...props}
    />
  );
});
