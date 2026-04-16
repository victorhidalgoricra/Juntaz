'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getParticipantDisplayName } from '@/lib/payment-instructions';
import { fetchProfilesByIds } from '@/services/profile.service';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { Profile } from '@/types/domain';

export default function MembersPage({ params }: { params: { id: string } }) {
  const { members, juntas, setData } = useAppStore();
  const user = useAuthStore((s) => s.user);
  const [contacto, setContacto] = useState('');
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

  const junta = juntas.find((item) => item.id === params.id);
  const isCreator = Boolean(user && junta?.admin_id === user.id);
  const canEditTurnOrder = Boolean(isCreator && junta?.estado !== 'activa' && junta?.turn_assignment_mode === 'manual');

  const list = members.filter((m) => m.junta_id === params.id).sort((a, b) => a.orden_turno - b.orden_turno);
  const listProfileIds = useMemo(() => Array.from(new Set(list.map((member) => member.profile_id))), [list]);

  useEffect(() => {
    if (!user) return;
    fetchProfilesByIds(listProfileIds).then((result) => {
      if (!result.ok) return;
      const mapped = result.data.reduce<Record<string, Profile>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      setProfilesById(mapped);
    });
  }, [listProfileIds, user]);

  const hasInvalidManualOrder = useMemo(() => {
    if (list.length === 0) return false;
    const turns = list.map((member) => member.orden_turno).sort((a, b) => a - b);
    const hasDuplicates = new Set(turns).size !== turns.length;
    const hasGaps = turns.some((turn, idx) => turn !== idx + 1);
    return hasDuplicates || hasGaps;
  }, [list]);

  if (!user) {
    return <Card><p className="text-sm text-slate-600">Inicia sesión para continuar.</p></Card>;
  }

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
        <p className="mb-2 text-xs text-slate-600">
          Método de asignación: {junta?.turn_assignment_mode === 'manual' ? 'Manual' : 'Al azar'}
        </p>
        {junta?.turn_assignment_mode !== 'manual' && (
          <p className="mb-2 text-xs text-blue-700">El sistema sorteará el orden cuando la junta se active.</p>
        )}
        {junta?.turn_assignment_mode === 'manual' && junta?.estado === 'activa' && (
          <p className="mb-2 text-xs text-amber-700">La junta ya está activa: el orden de turnos quedó congelado.</p>
        )}
        {canEditTurnOrder && hasInvalidManualOrder && (
          <p className="mb-2 text-xs text-red-700">Corrige el orden manual: no puede haber turnos duplicados ni huecos.</p>
        )}
        <div className="space-y-2">
          {list.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded border p-2">
              <p className="text-sm">
                {getParticipantDisplayName(profilesById[m.profile_id] ?? { email: m.profile_id, celular: m.profile_id })} · turno #{m.orden_turno}
                {m.profile_id === user.id && <span className="ml-2 font-semibold text-blue-700">(Mi turno)</span>}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={!canEditTurnOrder}
                  onClick={() => setData({ members: members.map((x) => (x.id === m.id && x.orden_turno > 1 ? { ...x, orden_turno: x.orden_turno - 1 } : x)) })}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  disabled={!canEditTurnOrder}
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
