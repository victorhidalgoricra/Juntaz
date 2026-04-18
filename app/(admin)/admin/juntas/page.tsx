'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isBackofficeAdmin } from '@/services/auth-role.service';
import { AdminJuntaListItem, adminSoftDeleteJunta, fetchAdminJuntas } from '@/services/juntas.repository';
import { useAuthStore } from '@/store/auth-store';

export default function AdminJuntasPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminJuntaListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState<'todos' | 'borrador' | 'activa' | 'cerrada'>('todos');
  const [visibilidad, setVisibilidad] = useState<'todas' | 'publica' | 'privada'>('todas');
  const [tipo, setTipo] = useState<'todos' | 'normal' | 'incentivo'>('todos');
  const [createdFrom, setCreatedFrom] = useState('');
  const [showBlocked, setShowBlocked] = useState(false);

  const [candidate, setCandidate] = useState<AdminJuntaListItem | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [blockedOverrides, setBlockedOverrides] = useState<Set<string>>(new Set());

  const isRowBlocked = useCallback((row: AdminJuntaListItem) => (
    Boolean(row.bloqueada) || String(row.estado_visual ?? '').toLowerCase() === 'bloqueada' || blockedOverrides.has(row.id)
  ), [blockedOverrides]);

  const getEstadoVisual = useCallback((row: AdminJuntaListItem) => (
    isRowBlocked(row) ? 'Bloqueada' : (row.estado_visual ?? row.estado)
  ), [isRowBlocked]);

  const loadRows = useCallback(async (includeBlocked: boolean) => {
    setLoading(true);
    const result = await fetchAdminJuntas({ includeBlocked });
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }
    setError(null);
    setRows(result.data.map((row) => (
      blockedOverrides.has(row.id)
        ? { ...row, bloqueada: true, estado_visual: 'bloqueada' }
        : row
    )));
    setLoading(false);
  }, [blockedOverrides]);

  useEffect(() => {
    if (!isBackofficeAdmin(user)) return;
    loadRows(showBlocked);
  }, [user, showBlocked, loadRows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const createdFromDate = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;

    return rows.filter((row) => {
      if (!showBlocked && isRowBlocked(row)) return false;
      if (estado !== 'todos' && row.estado !== estado) return false;
      if (visibilidad !== 'todas' && row.visibilidad !== visibilidad) return false;
      if (tipo !== 'todos' && row.tipo_junta !== tipo) return false;

      if (createdFromDate) {
        const createdAt = new Date(row.created_at);
        if (createdAt < createdFromDate) return false;
      }

      if (!normalizedQuery) return true;
      const searchable = [
        row.nombre,
        row.slug,
        row.admin_nombre ?? '',
        row.admin_email ?? ''
      ].join(' ').toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [createdFrom, estado, isRowBlocked, query, rows, showBlocked, tipo, visibilidad]);

  if (!isBackofficeAdmin(user)) {
    return <Card><p className="text-sm text-slate-600">No tienes permisos para acceder a gestión de juntas.</p></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gestión de juntas</h1>
          <p className="text-sm text-slate-600">Listado administrativo con trazabilidad y eliminación segura (soft delete).</p>
        </div>
        <Link href="/admin"><Button variant="outline">Volver al backoffice</Button></Link>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input className="rounded-md border px-3 py-2 text-sm" placeholder="Buscar por nombre, creador, slug o correo" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="rounded-md border px-3 py-2 text-sm" value={estado} onChange={(event) => setEstado(event.target.value as typeof estado)}>
            <option value="todos">Estado: todos</option>
            <option value="borrador">Borrador</option>
            <option value="activa">Activa</option>
            <option value="cerrada">Cerrada</option>
          </select>
          <select className="rounded-md border px-3 py-2 text-sm" value={visibilidad} onChange={(event) => setVisibilidad(event.target.value as typeof visibilidad)}>
            <option value="todas">Visibilidad: todas</option>
            <option value="publica">Pública</option>
            <option value="privada">Privada</option>
          </select>
          <select className="rounded-md border px-3 py-2 text-sm" value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)}>
            <option value="todos">Tipo: todos</option>
            <option value="normal">Normal</option>
            <option value="incentivo">Con incentivos</option>
          </select>
          <input className="rounded-md border px-3 py-2 text-sm" type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input id="show-blocked" type="checkbox" checked={showBlocked} onChange={(event) => setShowBlocked(event.target.checked)} />
          <label htmlFor="show-blocked">Ver también juntas eliminadas/bloqueadas</label>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-700">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Creador</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Visibilidad</th>
                <th className="px-3 py-2">Integrantes</th>
                <th className="px-3 py-2">Frecuencia</th>
                <th className="px-3 py-2">Creación</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className={`border-t align-top ${isRowBlocked(row) ? 'bg-slate-50 text-slate-500 opacity-85' : ''}`}>
                  <td className="px-3 py-2">
                    <p className={`font-medium ${isRowBlocked(row) ? 'text-slate-500' : 'text-slate-900'}`}>{row.nombre}</p>
                    <p className="text-xs text-slate-500">slug: {row.slug}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge>{getEstadoVisual(row)}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <p>{row.admin_nombre ?? 'Sin nombre'}</p>
                    <p className="text-xs text-slate-500">{row.admin_email ?? 'Sin correo'}</p>
                  </td>
                  <td className="px-3 py-2">{row.tipo_junta === 'incentivo' ? 'Con incentivos' : 'Normal'}</td>
                  <td className="px-3 py-2 capitalize">{row.visibilidad}</td>
                  <td className="px-3 py-2">{row.integrantes_actuales}/{row.participantes_max}</td>
                  <td className="px-3 py-2 capitalize">{row.frecuencia_pago}</td>
                  <td className="px-3 py-2">{new Date(row.created_at).toLocaleDateString('es-PE')}</td>
                  <td className="px-3 py-2">{new Date(row.fecha_inicio).toLocaleDateString('es-PE')}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/juntas/${row.id}`}><Button variant="outline">Ver detalle</Button></Link>
                      <Button variant="destructive" disabled={isRowBlocked(row)} onClick={() => setCandidate(row)}>
                        {isRowBlocked(row) ? 'Eliminada' : 'Eliminar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRows.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No hay juntas que coincidan con los filtros actuales.</div>
        )}

        {loading && <div className="p-6 text-sm text-slate-500">Cargando juntas...</div>}
        {error && <div className="p-6 text-sm text-red-600">{error}</div>}
      </Card>

      {candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-w-xl space-y-4 p-5">
            <h2 className="text-xl font-semibold">Eliminar junta</h2>
            <p className="text-sm text-slate-700">Junta: <span className="font-medium">{candidate.nombre}</span></p>
            {candidate.estado === 'activa' ? (
              <p className="text-sm text-rose-700">
                Esta junta se encuentra activa. Esta acción administrativa la eliminará del sistema y puede afectar participantes,
                turnos y trazabilidad. ¿Deseas continuar?
              </p>
            ) : (
              <p className="text-sm text-slate-700">Esta acción administrativa marcará la junta como cancelada/bloqueada para excluirla del flujo normal.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={submittingDelete} onClick={() => setCandidate(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={submittingDelete}
                onClick={async () => {
                  try {
                    setSubmittingDelete(true);
                    const result = await adminSoftDeleteJunta({ juntaId: candidate.id });
                    if (!result.ok) {
                      setError(result.message);
                      return;
                    }
                    setBlockedOverrides((prev) => {
                      const next = new Set(prev);
                      next.add(candidate.id);
                      return next;
                    });
                    setRows((prev) => (
                      showBlocked
                        ? prev.map((row) => row.id === candidate.id ? { ...row, bloqueada: true, estado_visual: 'bloqueada' } : row)
                        : prev.filter((row) => row.id !== candidate.id)
                    ));
                    await loadRows(showBlocked);
                    setCandidate(null);
                  } finally {
                    setSubmittingDelete(false);
                  }
                }}
              >
                {submittingDelete ? 'Eliminando...' : 'Sí, eliminar junta'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
