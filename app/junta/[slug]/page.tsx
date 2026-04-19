'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PublicNav } from '@/components/marketing/public-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchPublicJuntas } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { useAuthStore } from '@/store/auth-store';

export default function JuntaPublicPage({ params }: { params: { slug: string } }) {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [junta, setJunta] = useState<Junta | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const result = await fetchPublicJuntas();
      if (!mounted) return;

      if (!result.ok) {
        setError('No pudimos cargar esta junta pública.');
        setLoading(false);
        return;
      }

      const found = result.data.find((item) => item.slug === params.slug) ?? null;
      setJunta(found);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [params.slug]);

  const integrantes = useMemo(() => Number(junta?.integrantes_actuales ?? 0), [junta?.integrantes_actuales]);
  const participantesMax = Number(junta?.participantes_max ?? 0);
  const plazas = Math.max(0, participantesMax - integrantes);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        {loading && <Card>Cargando detalle de la junta...</Card>}
        {!loading && error && <Card><p className="text-red-600">{error}</p></Card>}
        {!loading && !error && !junta && <Card>Esta junta no está disponible públicamente.</Card>}

        {!loading && !error && junta && (
          <Card className="space-y-3">
            <h1 className="text-2xl font-bold">{junta.nombre}</h1>
            <p className="text-slate-600">Monto por cuota: {junta.moneda ?? 'PEN'} {junta.cuota_base ?? junta.monto_cuota}</p>
            <p className="text-slate-600">Frecuencia: {junta.frecuencia_pago}</p>
            <p className="text-slate-600">Tipo: {junta.tipo_junta ?? 'normal'}</p>
            <p className="text-slate-600">Estado: {junta.estado}</p>
            <p className="text-slate-600">Participantes: {integrantes}/{participantesMax}</p>
            <p className="text-slate-600">Plazas disponibles: {plazas}</p>
            {user ? (
              <Link href="/juntas">
                <Button>Ir a juntas para unirme</Button>
              </Link>
            ) : (
              <Link href={`/login?redirect=${encodeURIComponent('/juntas')}`}>
                <Button>Iniciar sesión para unirme</Button>
              </Link>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
