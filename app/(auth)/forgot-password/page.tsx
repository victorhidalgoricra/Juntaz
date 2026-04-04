'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full space-y-4">
      <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
      <p className="text-sm text-slate-500">Se enviará un enlace al correo registrado (modo MVP local).</p>
      <Input placeholder="Correo" />
      <Button>Enviar enlace</Button>
    </Card>
  );
}
