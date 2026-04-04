'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { fetchAvailableJuntas, findJuntaByAccessCode } from '@/services/juntas.repository';

const filters = [
  { id: 'todas', label: 'Todas' },
  { id: 'publica', label: 'Públicas' },
  { id: 'privada', label: 'Privadas' },
  { id: 'mis', label: 'Mis participaciones' }
] as const;

type FilterId = (typeof filters)[number]['id'];

export default function JuntasDisponiblesPage() {
  const user = useAuthStore((s) => s.user);
  const allJuntas = useAppStore((s) => (Array.isArray(s.juntas) ? s.juntas : []));
  const allMembers = useAppStore((s) => (Array.isArray(s.members) ? s.members : []));
  const setData = useAppStore((s) => s.setData);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('todas');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      const result = await fetchAvailableJuntas(user.id);
      if (result.ok) {
        if (result.data.length > 0) setData({ juntas: result.data });
      } else {
        setError(result.message);
      }
      setLoading(false);
    };

    load();
  }, [user, setData]);

  const membershipMap = useMemo(() => new Set(allMembers.filter((m) => m.profile_id === user?.id).map((m) => m.junta_id)), [allMembers, user?.id]);

  const visibleJuntas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allJuntas.filter((j) => {
      const isMine = j.admin_id === user?.id || membershipMap.has(j.id);
      const passesFilter =
        activeFilter === 'todas' ||
        (activeFilter === 'publica' && j.visibilidad === 'publica') ||
        (activeFilter === 'privada' && j.visibilidad === 'privada') ||
        (activeFilter === 'mis' && isMine);

      const passesQuery =
        normalizedQuery.length === 0 ||
        j.nombre.toLowerCase().includes(normalizedQuery) ||
        (j.descripcion ?? '').toLowerCase().includes(normalizedQuery);

      return passesFilter && passesQuery;
    });
  }, [activeFilter, allJuntas, membershipMap, query, user?.id]);

  if (!user) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold">Juntas disponibles</h1>
        <p className="text-sm text-slate-600">Explora juntas públicas o accede a una privada con tu enlace o código.</p>
        <Link href="/login?redirect=/juntas">
          <Button>Iniciar sesión</Button>
        </Link>
      </Card>
    );
  }

  const handlePrivateAccess = async () => {
    setCodeError(null);
    const normalizedCode = accessCode.trim().toUpperCase();
    if (!normalizedCode) {
      setCodeError('Ingresa un código para continuar.');
      return;
    }

    const result = await findJuntaByAccessCode(normalizedCode);
    if (!result.ok) {
      setCodeError(result.message);
      return;
    }

    if (!result.data) {
      setCodeError('Código inválido. Revisa el código e inténtalo de nuevo.');
      return;
    }

    setData({ juntas: [result.data, ...allJuntas.filter((j) => j.id !== result.data?.id)] });
    window.location.href = `/juntas/${result.data.id}`;
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Juntas disponibles</h1>
          <p className="text-sm text-slate-200">Explora juntas públicas o accede a una privada con tu enlace o código.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
          <Input
            placeholder="Buscar por nombre o descripción"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-slate-500 bg-white/95 text-slate-900"
          />
          <Input
            placeholder="Ej: PRIV-8KQ2"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
            className="border-slate-500 bg-white/95 text-slate-900"
          />
          <Button onClick={handlePrivateAccess}>Ingresar con código</Button>
        </div>
        {codeError && <p className="text-xs text-rose-200">{codeError}</p>}

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === filter.id ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {loading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="h-44 animate-pulse bg-slate-100" />
          ))}
        </div>
      )}
      {error && <Card><p className="text-sm text-red-600">Error cargando juntas: {error}</p></Card>}

      {!loading && !error && (visibleJuntas.length === 0 ? (
        <Card className="space-y-2 border-dashed p-8 text-center">
          <p className="text-lg font-semibold">Sin resultados para este filtro</p>
          <p className="text-sm text-slate-600">Prueba cambiar de filtro, buscar otro término o ingresar un código privado.</p>
          <Link href="/juntas/new"><Button>Crear nueva junta</Button></Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleJuntas.map((j) => {
            const isMine = j.admin_id === user.id || membershipMap.has(j.id);
            const description = j.descripcion?.trim() || 'Junta sin descripción aún.';

            return (
              <Card key={j.id} className="flex h-full flex-col justify-between gap-4 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold leading-tight">{j.nombre}</h3>
                    <Badge>{j.visibilidad === 'publica' ? 'Pública' : 'Privada'}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{description}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p><span className="font-medium">Grupo:</span> {j.participantes_max}</p>
                    <p><span className="font-medium">Aporte:</span> S/ {j.monto_cuota}</p>
                    <p><span className="font-medium">Tipo:</span> {j.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</p>
                    <p><span className="font-medium">Incentivo:</span> {Number(j.incentivo_porcentaje ?? 0)}%</p>
                    <p><span className="font-medium">Frecuencia:</span> {j.frecuencia_pago}</p>
                    <p><span className="font-medium">Estado:</span> {j.estado}</p>
                    <p className="col-span-2"><span className="font-medium">Inicio:</span> {j.fecha_inicio}</p>
                  </div>

                  {j.visibilidad === 'privada' && !isMine && (
                    <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">Acceso privado: requiere enlace o código válido.</div>
                  )}
                  {j.visibilidad === 'publica' && (
                    <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700">Visible para usuarios autenticados en el catálogo.</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/juntas/${j.id}`}><Button variant="outline">Ver detalle</Button></Link>
                  {j.visibilidad === 'publica' ? (
                    <Button>Unirme</Button>
                  ) : (
                    <Button variant="ghost">Acceso privado</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
