'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchProfilesByIds } from '@/services/profile.service';
import { Profile } from '@/types/domain';
import { buildPaymentDebtItems } from '@/lib/payment-debts';
import { formatCalendarDate } from '@/lib/calendar-date';

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

export function NotificationsPanel() {
  const user = useAuthStore((s) => s.user);
  const { notifications, juntas, members, schedules, payments, setData } = useAppStore();
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

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

  const debtNotifications = useMemo(() => buildPaymentDebtItems({
    userId: user?.id ?? '',
    juntas,
    members,
    schedules,
    payments,
    profilesById,
    fallbackProfile: user
  }).filter((item) => item.status !== 'pagada').slice(0, 8), [juntas, members, payments, profilesById, schedules, user]);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notificaciones</h1>
        <Button variant="outline" onClick={() => setData({ notifications: notifications.map((n) => ({ ...n, leida: true })) })}>Marcar leídas</Button>
      </div>
      <div className="space-y-2">
        {debtNotifications.length > 0 && (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Cuotas pendientes</p>
            {debtNotifications.map((item) => (
              <div key={item.id} className="rounded-md border bg-white p-2">
                <p className="text-sm font-medium">{item.juntaNombre} · Cuota {item.cuotaNumero}</p>
                <p className="text-xs text-slate-600">Debes pagar a {item.receiverName} · {money(item.monto)} · vence {formatCalendarDate(item.dueDate)}</p>
                <div className="mt-1">
                  <Link href={`/juntas/${item.juntaId}/registrar-pago?juntaId=${encodeURIComponent(item.juntaId)}&cuotaId=${encodeURIComponent(item.cuotaId)}&src=notifications`}>
                    <Button variant="outline">Pagar</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {notifications.length === 0 ? <p className="text-sm text-slate-500">No hay alertas por ahora.</p> : notifications.map((n) => (
          <div className="rounded border p-2" key={n.id}><p className="font-medium">{n.titulo}</p><p className="text-sm">{n.mensaje}</p></div>
        ))}
      </div>
    </Card>
  );
}
