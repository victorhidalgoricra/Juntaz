'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export default function JuntaPublicPage({ params }: { params: { slug: string } }) {
  const junta = useAppStore((s) => s.juntas.find((j) => j.slug === params.slug));
  const members = useAppStore((s) => s.members.filter((m) => m.junta_id === junta?.id));
  const user = useAuthStore((s) => s.user);

  if (!junta) return notFound();

  const plazas = junta.participantes_max - members.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card className="space-y-3">
          <h1 className="text-2xl font-bold">{junta.nombre}</h1>
          <p className="text-slate-600">Monto por cuota: {junta.moneda} {junta.monto_cuota}</p>
          <p className="text-slate-600">Frecuencia: {junta.frecuencia_pago}</p>
          <p className="text-slate-600">Participantes: {members.length}/{junta.participantes_max}</p>
          <p className="text-slate-600">Plazas disponibles: {plazas}</p>
          {user ? (
            <Button
              onClick={() => {
                if (members.some((m) => m.profile_id === user.id)) return;
                useAppStore.getState().setData({
                  members: [
                    ...useAppStore.getState().members,
                    { id: crypto.randomUUID(), junta_id: junta.id, profile_id: user.id, estado: 'pendiente', orden_turno: members.length + 1 }
                  ]
                });
                alert('Solicitud enviada / unión registrada en modo demo.');
              }}
            >
              Quiero unirme
            </Button>
          ) : (
            <Link href={`/login?redirect=${encodeURIComponent(`/junta/${params.slug}`)}`}>
              <Button>Quiero unirme</Button>
            </Link>
          )}
        </Card>
      </main>
    </div>
  );
}
