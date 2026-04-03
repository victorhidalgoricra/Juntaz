'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { validarActivacionJunta } from '@/services/junta.service';

export default function JuntaDetailPage({ params }: { params: { id: string } }) {
  const { juntas, members, setData } = useAppStore();
  const junta = juntas.find((j) => j.id === params.id);
  const [nombre, setNombre] = useState(junta?.nombre ?? '');
  const [monto, setMonto] = useState(String(junta?.monto_cuota ?? ''));
  if (!junta) return notFound();
  const miembros = members.filter((m) => m.junta_id === junta.id);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-semibold">{junta.nombre}</h1>
        <p className="text-sm text-slate-500">{junta.descripcion}</p>
        <div className="mt-2 flex gap-2"><Badge>{junta.estado}</Badge><Badge>{junta.frecuencia_pago}</Badge></div>
        <p className="mt-3 text-sm">Enlace público: <Link className="text-blue-600 underline" href={`/junta/${junta.slug}`}>/junta/{junta.slug}</Link></p>
      </Card>

      {junta.estado === 'borrador' && (
        <Card className="space-y-2">
          <h2 className="font-semibold">Editar junta antes de activación</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Input value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => setData({ juntas: juntas.map((j) => (j.id === junta.id ? { ...j, nombre, monto_cuota: Number(monto) } : j)) })}
          >
            Guardar edición
          </Button>
        </Card>
      )}

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
