'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';

export default function MisJuntasPage() {
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));

  if (!user) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Mis juntas</h1>
        <p className="text-sm text-slate-600">Para gestionar tus juntas debes iniciar sesión.</p>
        <Link href="/login?redirect=/juntas">
          <Button>Iniciar sesión</Button>
        </Link>
      </Card>
    );
  }

  const juntas = allJuntas.filter((j) => j?.admin_id === user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis juntas</h1>
        <Link href="/juntas/new"><Button>Nueva junta</Button></Link>
      </div>

      {juntas.length === 0 ? (
        <Card className="space-y-2">
          <p className="font-medium">Aún no tienes juntas</p>
          <p className="text-sm text-slate-600">Crea tu primera junta en menos de 2 minutos.</p>
          <Link href="/juntas/new"><Button>Crear mi primera junta</Button></Link>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {juntas.map((j) => (
            <Card key={j.id}>
              <Link className="font-semibold" href={`/juntas/${j.id}`}>{j.nombre}</Link>
              <p className="mt-1 text-xs text-slate-500">Enlace: /junta/{j.slug ?? 'sin-slug'}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
