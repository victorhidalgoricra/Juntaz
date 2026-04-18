import { Suspense } from 'react';
import { RegisterPageClient } from './register-page-client';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full rounded-lg border bg-white p-6">Cargando registro...</div>}>
      <RegisterPageClient />
    </Suspense>
  );
}
