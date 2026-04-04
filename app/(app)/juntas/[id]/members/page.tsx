'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export default function MembersPage({ params }: { params: { id: string } }) {
  const { members, setData } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const [contacto, setContacto] = useState('');

  if (!user) {
    return <Card><p className="text-sm text-slate-600">Inicia sesión para continuar.</p></Card>;
  }

  const list = members.filter((m) => m.junta_id === params.id).sort((a, b) => a.orden_turno - b.orden_turno);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Invitar integrante</h2>
        <div className="flex gap-2">
          <Input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Correo o celular" />
          <Button
            onClick={() => {
              if (!contacto) return;
              setData({
                members: [...members, { id: crypto.randomUUID(), junta_id: params.id, profile_id: contacto, estado: 'invitado', orden_turno: list.length + 1 }]
              });
              setContacto('');
            }}
          >
            Invitar
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Turnos e integrantes</h2>
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded border p-2">
              <p className="text-sm">
                {m.profile_id} · turno #{m.orden_turno}
                {m.profile_id === user.id && <span className="ml-2 font-semibold text-blue-700">(Mi turno)</span>}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setData({ members: members.map((x) => (x.id === m.id && x.orden_turno > 1 ? { ...x, orden_turno: x.orden_turno - 1 } : x)) })}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setData({ members: members.map((x) => (x.id === m.id ? { ...x, orden_turno: x.orden_turno + 1 } : x)) })}
                >
                  ↓
                </Button>
                <Badge>{m.estado}</Badge>
                {m.estado === 'invitado' && (
                  <Button variant="destructive" onClick={() => setData({ members: members.filter((x) => x.id !== m.id) })}>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
