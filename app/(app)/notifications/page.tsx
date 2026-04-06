'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';

export default function NotificationsPage() {
  const { notifications, setData } = useAppStore();
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notificaciones</h1>
        <Button variant="outline" onClick={() => setData({ notifications: notifications.map((n) => ({ ...n, leida: true })) })}>Marcar leídas</Button>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 ? <p className="text-sm text-slate-500">No hay alertas por ahora.</p> : notifications.map((n) => (
          <div className="rounded border p-2" key={n.id}><p className="font-medium">{n.titulo}</p><p className="text-sm">{n.mensaje}</p></div>
        ))}
      </div>
    </Card>
  );
}
