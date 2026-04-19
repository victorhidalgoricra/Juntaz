import { ReactNode } from 'react';
import { PublicNav } from '@/components/marketing/public-nav';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNav />
      <div className="mx-auto flex min-h-[calc(100vh-60px)] w-full max-w-md items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
