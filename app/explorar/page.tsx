'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchPublicJuntas } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';

export default function ExplorarPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [juntas, setJuntas] = useState<Junta[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchPublicJuntas();
      if (result.ok) setJuntas(result.data);
      else setError(result.message);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <h1 className="text-3xl font-bold">Juntas disponibles</h1>
        <p className="text-slate-600">Explora juntas públicas abiertas para unirte.</p>

        {loading && <Card>Cargando juntas públicas...</Card>}
        {error && <Card><p className="text-red-600">{error}</p></Card>}

        {!loading && !error && (juntas.length === 0 ? (
          <Card>No hay juntas públicas por ahora.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {juntas.map((j) => (
              <Card key={j.id} className="space-y-2">
                <h2 className="font-semibold">{j.nombre}</h2>
                <p className="text-sm text-slate-600 line-clamp-2">{j.descripcion ?? 'Sin descripción'}</p>
                <p className="text-xs text-slate-500">Grupo: {j.participantes_max} · Aporte: S/ {j.monto_cuota} · {j.frecuencia_pago}</p>
                <p className="text-xs text-slate-500">Inicio: {j.fecha_inicio}</p>
                <Link href={`/junta/${j.slug}`}><Button>Ver / Unirme</Button></Link>
              </Card>
            ))}
          </div>
        ))}
      </main>
    </div>
  );
}
