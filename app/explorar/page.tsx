'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchPublicJuntas, fetchMembersByJuntaIds } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';

export default function ExplorarPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [juntas, setJuntas] = useState<Junta[]>([]);
  const [membersCount, setMembersCount] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPublicJuntas();
        if (!mounted) return;
        if (!result.ok) {
          setError(result.message);
          return;
        }

        setJuntas(result.data);
        if (result.data.length > 0) {
          const membersResult = await fetchMembersByJuntaIds(result.data.map((j) => j.id));
          if (mounted && membersResult.ok) {
            const count = membersResult.data.reduce<Record<string, number>>((acc, member) => {
              if (member.estado !== 'activo') return acc;
              acc[member.junta_id] = (acc[member.junta_id] ?? 0) + 1;
              return acc;
            }, {});
            setMembersCount(count);
          }
        }
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo público.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const emptyMessage = useMemo(() => 'No hay juntas públicas por ahora.', []);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <h1 className="text-3xl font-bold">Juntas disponibles</h1>
        <p className="text-slate-600">Explora juntas públicas y únete con un solo paso.</p>

        {loading && <Card>Cargando juntas públicas...</Card>}
        {error && <Card><p className="text-red-600">{error}</p></Card>}

        {!loading && !error && (juntas.length === 0 ? (
          <Card>{emptyMessage}</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {juntas.map((j) => {
              const integrantes = membersCount[j.id] ?? 0;
              const cupoCompleto = integrantes >= j.participantes_max;
              return (
                <Card key={j.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{j.nombre}</h2>
                    <Badge>Pública</Badge>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{j.descripcion ?? 'Sin descripción'}</p>
                  <p className="text-xs text-slate-500">Frecuencia: {j.frecuencia_pago} · Cuota: S/ {j.cuota_base ?? j.monto_cuota}</p>
                  <p className="text-xs text-slate-500">Inicio: {j.fecha_inicio} · Integrantes: {integrantes}/{j.participantes_max}</p>
                  <div className="flex gap-2">
                    <Link href={`/junta/${j.slug}`}><Button variant="outline">Ver detalle</Button></Link>
                    {user ? (
                      <Link href={`/juntas`}><Button disabled={cupoCompleto}>{cupoCompleto ? 'Cupo completo' : 'Unirme'}</Button></Link>
                    ) : (
                      <Link href={`/login?redirect=${encodeURIComponent(`/junta/${j.slug}`)}`}><Button>Iniciar sesión para unirme</Button></Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </main>
    </div>
  );
}
