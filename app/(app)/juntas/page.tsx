'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';

export default function MisJuntasPage() {
  const user = useAuthStore((s) => s.user)!;
  const juntas = useAppStore((s) => s.juntas.filter((j) => j.admin_id === user.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis juntas</h1>
        <Link href="/juntas/new"><Button>Nueva junta</Button></Link>
      </div>
      {juntas.length === 0 ? <Card>Aún no tienes juntas. Crea la primera para empezar.</Card> : (
        <div className="grid gap-3 md:grid-cols-2">
          {juntas.map((j) => (
            <Card key={j.id}>
              <Link className="font-semibold" href={`/juntas/${j.id}`}>{j.nombre}</Link>
              <p className="mt-1 text-xs text-slate-500">Enlace: /junta/{j.slug}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
