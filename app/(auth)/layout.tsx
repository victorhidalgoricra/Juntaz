import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-md items-center p-4">{children}</div>;
}
