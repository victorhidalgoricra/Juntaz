'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { adminSoftDeleteJunta, fetchJuntaById, fetchMembersByJuntaIds } from '@/services/juntas.repository';
import { Junta } from '@/types/domain';
import { formatCalendarDate } from '@/lib/calendar-date';

export default function AdminJuntaDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const { payments, schedules, members, setData } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [junta, setJunta] = useState<Junta | null>(null);

  useEffect(() => {
    if (!isBackofficeAdmin(user)) return;

    const load = async () => {
      setLoading(true);
      const result = await fetchJuntaById(params.id);
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setJunta(result.data);

      const membersResult = await fetchMembersByJuntaIds([params.id]);
      if (membersResult.ok) setData({ members: membersResult.data });

      setLoading(false);
    };

    load();
  }, [params.id, setData, user]);

  const stats = useMemo(() => {
    if (!junta) return { memberCount: 0, schedulesCount: 0, paymentsCount: 0 };
    return {
      memberCount: members.filter((m) => m.junta_id === junta.id).length,
      schedulesCount: schedules.filter((s) => s.junta_id === junta.id).length,
      paymentsCount: payments.filter((p) => p.junta_id === junta.id).length
    };
  }, [junta, members, payments, schedules]);

  if (!isBackofficeAdmin(user)) {
    return <Card><p className="text-sm text-slate-600">No tienes permisos para ver esta vista.</p></Card>;
  }

  if (loading) return <Card><p className="text-sm text-slate-600">Cargando detalle de junta...</p></Card>;
  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;
  if (!junta) return <Card><p className="text-sm text-slate-600">Junta no encontrada.</p></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Detalle administrativo de junta</h1>
          <p className="text-sm text-slate-600">Revisión operativa y acción de eliminación administrativa.</p>
        </div>
        <Link href="/admin/juntas"><Button variant="outline">Volver al listado</Button></Link>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{junta.nombre}</h2>
          <Badge>{junta.estado}</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <p><span className="font-medium">Admin:</span> {junta.admin_id}</p>
          <p><span className="font-medium">Tipo:</span> {junta.tipo_junta ?? 'normal'}</p>
          <p><span className="font-medium">Visibilidad:</span> {junta.visibilidad}</p>
          <p><span className="font-medium">Frecuencia:</span> {junta.frecuencia_pago}</p>
          <p><span className="font-medium">Inicio:</span> {formatCalendarDate(junta.fecha_inicio)}</p>
          <p><span className="font-medium">Creación:</span> {new Date(junta.created_at).toLocaleDateString('es-PE')}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><p className="text-xs text-slate-500">Miembros</p><p className="text-2xl font-semibold">{stats.memberCount}</p></Card>
          <Card><p className="text-xs text-slate-500">Rondas programadas</p><p className="text-2xl font-semibold">{stats.schedulesCount}</p></Card>
          <Card><p className="text-xs text-slate-500">Pagos registrados</p><p className="text-2xl font-semibold">{stats.paymentsCount}</p></Card>
        </div>

        <div className="pt-2">
          <Button
            variant="destructive"
            disabled={isDeleting || Boolean(junta.bloqueada)}
            onClick={async () => {
              const warning = junta.estado === 'activa'
                ? 'Esta junta se encuentra activa. Esta acción administrativa la eliminará del sistema y puede afectar participantes, turnos y trazabilidad. ¿Deseas continuar?'
                : 'Esta acción administrativa marcará la junta como cancelada/bloqueada. ¿Deseas continuar?';
              if (!window.confirm(warning)) return;

              setIsDeleting(true);
              const result = await adminSoftDeleteJunta({ juntaId: junta.id });
              if (!result.ok) {
                setError(result.message);
                setIsDeleting(false);
                return;
              }

              setJunta((previous) => (previous ? { ...previous, bloqueada: true, cerrar_inscripciones: true } : previous));
              setData({ juntas: [] });
              setIsDeleting(false);
            }}
          >
            {junta.bloqueada ? 'Junta ya eliminada' : isDeleting ? 'Eliminando...' : 'Eliminar junta'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
