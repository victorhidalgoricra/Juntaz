'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchProfilesByIds } from '@/services/profile.service';
import { fetchUserJuntaSnapshot } from '@/services/juntas.repository';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Profile } from '@/types/domain';
import { buildPaymentDebtItems } from '@/lib/payment-debts';
import { formatCalendarDate } from '@/lib/calendar-date';

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

export default function PagarPage() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const { juntas, members, schedules, payments, setData } = useAppStore();
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!user?.id) return;
    fetchUserJuntaSnapshot(user.id).then((result) => {
      if (!result.ok) return;
      setData({
        juntas: result.data.juntas,
        members: result.data.members,
        schedules: result.data.schedules,
        payments: result.data.payments,
        payouts: result.data.payouts
      });
    });
  }, [setData, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const ids = Array.from(new Set([user.id, ...members.map((member) => member.profile_id)]));
    fetchProfilesByIds(ids).then((result) => {
      if (!result.ok) return;
      const mapped = result.data.reduce<Record<string, Profile>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      if (!mapped[user.id]) mapped[user.id] = user;
      setProfilesById(mapped);
    });
  }, [members, user]);

  const debts = useMemo(() => buildPaymentDebtItems({
    userId: user?.id ?? '',
    juntas,
    members,
    schedules,
    payments,
    profilesById,
    fallbackProfile: user
  }), [juntas, members, payments, profilesById, schedules, user]);

  const pendingDebts = useMemo(() => debts.filter((item) => item.status !== 'pagada'), [debts]);
  const overdueCount = pendingDebts.filter((item) => item.status === 'vencida').length;
  const dueTodayCount = pendingDebts.filter((item) => item.status === 'vence_hoy').length;
  const totalPending = pendingDebts.reduce((acc, item) => acc + item.monto, 0);
  const groupedByJunta = useMemo(() => {
    const grouped = pendingDebts.reduce<Record<string, typeof pendingDebts>>((acc, item) => {
      acc[item.juntaId] = [...(acc[item.juntaId] ?? []), item];
      return acc;
    }, {});
    return Object.entries(grouped).map(([juntaId, items]) => ({
      juntaId,
      juntaNombre: items[0]?.juntaNombre ?? 'Junta',
      receiverName: items[0]?.receiverName ?? 'Receptor',
      total: items.reduce((acc, item) => acc + item.monto, 0),
      items
    }));
  }, [pendingDebts]);

  const focusJuntaId = searchParams.get('juntaId');
  const focusCuotaId = searchParams.get('cuotaId');

  if (!user) return <Card>Necesitas iniciar sesión para revisar tus pagos pendientes.</Card>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pagar cuotas pendientes</h1>
        <p className="text-sm text-slate-600">Vista resumida tipo “a quién debo pagar y cuánto”, agrupada por junta.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Total pendiente</p><p className="text-2xl font-semibold">{money(totalPending)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Cuotas pendientes</p><p className="text-2xl font-semibold">{pendingDebts.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Urgentes</p><p className="text-2xl font-semibold">{overdueCount + dueTodayCount}</p><p className="text-xs text-slate-500">{overdueCount} vencidas · {dueTodayCount} vencen hoy</p></Card>
      </div>

      {groupedByJunta.length === 0 ? (
        <Card className="p-5 text-sm text-slate-500">No tienes cuotas pendientes en este momento.</Card>
      ) : (
        <div className="space-y-3">
          {groupedByJunta.map((group) => (
            <Card key={group.juntaId} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{group.juntaNombre}</p>
                  <p className="text-sm text-slate-600">Debes pagar a {group.receiverName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total por junta</p>
                  <p className="font-semibold text-slate-900">{money(group.total)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const highlighted = item.juntaId === focusJuntaId && item.cuotaId === focusCuotaId;
                  return (
                    <div key={item.id} className={`rounded-md border p-3 ${highlighted ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">Cuota {item.cuotaNumero} · {money(item.monto)}</p>
                        <Badge>
                          {item.status === 'vencida' ? 'Vencida' : item.status === 'vence_hoy' ? 'Vence hoy' : 'Pendiente'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">Vencimiento: {formatCalendarDate(item.dueDate)}</p>
                      <p className="text-xs text-slate-600">Receptor: {item.receiverName} · Método: {item.receiverMethod}</p>
                      {!item.receiverMethodConfigured && (
                        <p className="mt-1 text-xs font-medium text-amber-700">El receptor aún no configuró su medio de pago.</p>
                      )}
                      {!item.myPayoutConfigured && (
                        <p className="mt-1 text-xs font-medium text-blue-700">Configura tu medio de pago para recibir aportes en próximas rondas.</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Link href={`/juntas/${item.juntaId}/registrar-pago?juntaId=${encodeURIComponent(item.juntaId)}&cuotaId=${encodeURIComponent(item.cuotaId)}&src=pay_center`}>
                          <Button>Pagar cuota</Button>
                        </Link>
                        <Link href={`/juntas/${item.juntaId}`}>
                          <Button variant="outline">Ver junta</Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
