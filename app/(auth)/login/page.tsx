import { Suspense } from 'react';
import { LoginPageClient } from './login-page-client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full rounded-lg border bg-white p-6">Cargando login...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
