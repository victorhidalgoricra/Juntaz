'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';

export function ProfilePanel() {
  const { user, setUser } = useAuthStore();
  if (!user) return null;

  return (
    <Card className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold">Perfil</h1>
      <Input value={user.nombre} onChange={(e) => setUser({ ...user, nombre: e.target.value })} />
      <Input value={user.celular} onChange={(e) => setUser({ ...user, celular: e.target.value })} placeholder="Celular" />
      <Input value={user.email} disabled />
      <Input value={user.dni ?? ''} onChange={(e) => setUser({ ...user, dni: e.target.value })} placeholder="DNI opcional" />
      <Button>Guardar cambios</Button>
    </Card>
  );
}
