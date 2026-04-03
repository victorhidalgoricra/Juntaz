'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';

export default function MembersPage({ params }: { params: { id: string } }) {
  const { members, setData } = useAppStore();
  const [contacto, setContacto] = useState('');
  const list = members.filter((m) => m.junta_id === params.id);

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
        <h2 className="mb-2 text-lg font-semibold">Lista de integrantes</h2>
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded border p-2">
              <p className="text-sm">{m.profile_id} · turno #{m.orden_turno}</p>
              <div className="flex items-center gap-2">
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
