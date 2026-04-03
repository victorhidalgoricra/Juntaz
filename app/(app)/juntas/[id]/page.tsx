'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { validarActivacionJunta } from '@/services/junta.service';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const { juntas, members, setData } = useAppStore();
  const junta = juntas.find((j) => j.id === params.id);
  if (!junta) return notFound();
  const miembros = members.filter((m) => m.junta_id === junta.id);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
        <p className="text-sm text-slate-500">{junta.descripcion}</p>
        <div className="mt-2 flex gap-2"><Badge>{junta.estado}</Badge><Badge>{junta.frecuencia_pago}</Badge></div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button><Link href={`/juntas/${junta.id}/members`}>Integrantes</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/schedule`}>Cronograma</Link></Button>
        <Button variant="outline"><Link href={`/juntas/${junta.id}/payments`}>Pagos</Link></Button>
        <Button
          variant="ghost"
          onClick={() => {
            try {
              validarActivacionJunta(miembros.length);
              setData({ juntas: juntas.map((j) => (j.id === junta.id ? { ...j, estado: 'activa' } : j)) });
            } catch (error) {
              alert((error as Error).message);
            }
          }}
        >
          Activar junta
        </Button>
      </div>
    </div>
  );
}
