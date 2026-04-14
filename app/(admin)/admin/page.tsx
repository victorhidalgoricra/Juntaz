'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { normalizePaymentStatus, paymentStatusLabel } from '@/lib/payment-status';
import { isBackofficeAdmin } from '@/services/auth-role.service';

type AdminTab = 'resumen' | 'pagos' | 'usuarios' | 'validaciones';
type ValidationStatus = 'pendiente' | 'aprobado' | 'rechazado';

export default function AdminPage() {
  const { juntas, members, payments, schedules, setData } = useAppStore();
  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [notesByPayment, setNotesByPayment] = useState<Record<string, string>>({});
  const [notesByUser, setNotesByUser] = useState<Record<string, string>>({});
  const [userValidation, setUserValidation] = useState<Record<string, ValidationStatus>>({});

  if (!isBackofficeAdmin(authUser)) {
    return <Card><p className="text-sm text-slate-600">No tienes permisos para acceder al backoffice.</p></Card>;
  }

  const paymentRows = payments.map((payment) => {
    const junta = juntas.find((item) => item.id === payment.junta_id);
    const schedule = schedules.find((item) => item.id === payment.schedule_id);
    const status = normalizePaymentStatus(payment.estado);

    return {
      payment,
      status,
      juntaName: junta?.nombre ?? 'Junta',
      semana: schedule?.cuota_numero ?? '-',
      expectedAmount: payment.expected_amount ?? schedule?.monto ?? payment.monto,
      submittedAmount: payment.submitted_amount ?? payment.monto,
      submittedAt: payment.submitted_at ?? payment.pagado_en
    };
  });

  const reviewablePayments = paymentRows.filter((row) => row.status === 'submitted' || row.status === 'validating' || row.status === 'rejected');

  const userRows = (() => {
    const ids = Array.from(new Set(members.map((m) => m.profile_id)));
    return ids.map((id) => {
      const state = userValidation[id] ?? 'pendiente';
      const isCurrentUser = id === authUser?.id;
      return {
        id,
        nombre: isCurrentUser ? authUser?.nombre ?? 'Usuario backoffice' : 'Usuario plataforma',
        email: isCurrentUser ? authUser?.email ?? 'sin-correo' : 'sin-correo',
        celular: isCurrentUser ? authUser?.celular ?? 'sin-celular' : 'sin-celular',
        dni: isCurrentUser ? authUser?.dni ?? 'sin-dni' : 'sin-dni',
        estado: state,
        observacion: notesByUser[id] ?? '',
        juntas: members.filter((m) => m.profile_id === id).length,
        registradoEn: new Date().toISOString()
      };
    });
  })();

  const kpis = (() => {
    const pending = paymentRows.filter((r) => r.status === 'submitted' || r.status === 'validating').length;
    const approved = paymentRows.filter((r) => r.status === 'approved').length;
    const rejected = paymentRows.filter((r) => r.status === 'rejected').length;
    const activeJuntas = juntas.filter((j) => j.estado === 'activa').length;
    const activeUsers = userRows.filter((u) => u.estado === 'aprobado').length;
    const usersPending = userRows.filter((u) => u.estado === 'pendiente').length;
    const amountPending = paymentRows.filter((r) => r.status === 'submitted' || r.status === 'validating').reduce((acc, row) => acc + row.submittedAmount, 0);
    const amountCollected = paymentRows.filter((r) => r.status === 'approved').reduce((acc, row) => acc + row.submittedAmount, 0);

    return { pending, approved, rejected, activeJuntas, activeUsers, usersPending, amountPending, amountCollected };
  })();

  const updatePaymentStatus = (paymentId: string, next: 'approved' | 'rejected' | 'validating') => {
    const now = new Date().toISOString();
    const note = notesByPayment[paymentId]?.trim();

    setData({
      payments: payments.map((payment) => payment.id === paymentId
        ? {
          ...payment,
          estado: next,
          payment_status: next,
          internal_note: note || payment.internal_note,
          validated_at: next === 'approved' || next === 'rejected' ? now : payment.validated_at,
          validated_by: next === 'approved' || next === 'rejected' ? (authUser?.id ?? 'backoffice') : payment.validated_by,
          rejection_reason: next === 'rejected' ? note || 'Rechazado por backoffice' : undefined
        }
        : payment)
    });
  };

  const deleteUser = (profileId: string) => {
    const ok = window.confirm('¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.');
    if (!ok) return;

    setData({
      members: members.filter((member) => member.profile_id !== profileId),
      payments: payments.filter((payment) => payment.profile_id !== profileId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Backoffice</h1>
        <div className="flex gap-2">
          <Link href="/admin/pagos"><Button variant="outline">Validar pagos</Button></Link>
          <Link href="/dashboard"><Button variant="outline">Ir al producto</Button></Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['resumen', 'pagos', 'usuarios', 'validaciones'] as AdminTab[]).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl border px-4 py-1.5 text-sm ${tab === item ? 'border-blue-600 text-blue-700' : 'border-slate-300 text-slate-600'}`}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Card><p className="text-xs text-slate-500">Pagos pendientes</p><p className="text-2xl font-bold">{kpis.pending}</p></Card>
          <Card><p className="text-xs text-slate-500">Pagos aprobados</p><p className="text-2xl font-bold">{kpis.approved}</p></Card>
          <Card><p className="text-xs text-slate-500">Pagos rechazados</p><p className="text-2xl font-bold">{kpis.rejected}</p></Card>
          <Card><p className="text-xs text-slate-500">Juntas activas</p><p className="text-2xl font-bold">{kpis.activeJuntas}</p></Card>
          <Card><p className="text-xs text-slate-500">Usuarios activos</p><p className="text-2xl font-bold">{kpis.activeUsers}</p></Card>
          <Card><p className="text-xs text-slate-500">Usuarios pendientes</p><p className="text-2xl font-bold">{kpis.usersPending}</p></Card>
          <Card><p className="text-xs text-slate-500">Monto pendiente</p><p className="text-2xl font-bold">S/ {kpis.amountPending.toFixed(0)}</p></Card>
          <Card><p className="text-xs text-slate-500">Monto recaudado</p><p className="text-2xl font-bold">S/ {kpis.amountCollected.toFixed(0)}</p></Card>
        </div>
      )}

      {tab === 'pagos' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Pagos para validación</h2>
          {reviewablePayments.length === 0 ? <p className="text-sm text-slate-500">No hay pagos pendientes por validar.</p> : reviewablePayments.map((row) => (
            <div key={row.payment.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_0.8fr_1fr_1fr_1fr_auto]">
              <div>
                <p className="font-semibold">{row.juntaName}</p>
                <p className="text-xs text-slate-500">Semana {row.semana} · {new Date(row.submittedAt).toLocaleDateString('es-PE')}</p>
              </div>
              <p>Esperado: S/{row.expectedAmount.toFixed(2)}</p>
              <p>Enviado: S/{row.submittedAmount.toFixed(2)}</p>
              <p>{row.payment.payment_method ?? 'Sin método'}</p>
              <p>{paymentStatusLabel(row.status)}</p>
              <div className="space-y-1">
                <input className="w-full rounded border px-2 py-1 text-xs" placeholder="Motivo / nota" value={notesByPayment[row.payment.id] ?? ''} onChange={(event) => setNotesByPayment((prev) => ({ ...prev, [row.payment.id]: event.target.value }))} />
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" onClick={() => updatePaymentStatus(row.payment.id, 'approved')}>Aprobar</Button>
                  <Button variant="destructive" onClick={() => updatePaymentStatus(row.payment.id, 'rejected')}>Rechazar</Button>
                  <Link href={`/admin/pagos/${row.payment.id}`}><Button variant="ghost">Ver detalle</Button></Link>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === 'usuarios' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Gestión de usuarios</h2>
          {userRows.length === 0 ? <p className="text-sm text-slate-500">No hay usuarios para mostrar.</p> : userRows.map((userRow) => (
            <div key={userRow.id} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div>
                <p className="font-medium">{userRow.nombre}</p>
                <p className="text-xs text-slate-500">{userRow.email}</p>
                <p className="text-xs text-slate-500">{userRow.celular} · DNI {userRow.dni}</p>
              </div>
              <p>{userRow.juntas} juntas</p>
              <p>Registro: {new Date(userRow.registradoEn).toLocaleDateString('es-PE')}</p>
              <Button variant="destructive" onClick={() => deleteUser(userRow.id)}>Eliminar usuario</Button>
            </div>
          ))}
        </Card>
      )}

      {tab === 'validaciones' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Validación de datos de usuario</h2>
          {userRows.length === 0 ? <p className="text-sm text-slate-500">No hay usuarios para validar.</p> : userRows.map((userRow) => (
            <div key={`validation-${userRow.id}`} className="grid gap-2 rounded border p-3 text-sm md:grid-cols-[1.4fr_1fr_auto]">
              <div>
                <p className="font-medium">{userRow.nombre}</p>
                <p className="text-xs text-slate-500">{userRow.email} · {userRow.celular}</p>
                <p className="text-xs text-slate-500">DNI: {userRow.dni}</p>
                <p className="text-xs text-slate-600">Estado: {userRow.estado}</p>
              </div>
              <textarea className="min-h-16 w-full rounded border px-2 py-1 text-xs" placeholder="Observación interna" value={notesByUser[userRow.id] ?? ''} onChange={(event) => setNotesByUser((prev) => ({ ...prev, [userRow.id]: event.target.value }))} />
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" onClick={() => setUserValidation((prev) => ({ ...prev, [userRow.id]: 'aprobado' }))}>Aprobar</Button>
                <Button variant="destructive" onClick={() => setUserValidation((prev) => ({ ...prev, [userRow.id]: 'rechazado' }))}>Rechazar</Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
