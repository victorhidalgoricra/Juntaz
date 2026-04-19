import { Junta, JuntaMember } from '@/types/domain';

export function getActiveMembersForJunta(junta: Junta, members: JuntaMember[]) {
  const active = members.filter((member) => member.junta_id === junta.id && member.estado === 'activo');
  const hasCreator = active.some((member) => member.profile_id === junta.admin_id);

  if (hasCreator) return active;

  return [
    {
      id: `creator-fallback-${junta.id}`,
      junta_id: junta.id,
      profile_id: junta.admin_id,
      estado: 'activo' as const,
      rol: 'admin' as const,
      orden_turno: 1
    },
    ...active
  ];
}

export function getActiveMemberCountByJunta(juntas: Junta[], members: JuntaMember[]) {
  const map = new Map<string, number>();
  juntas.forEach((junta) => {
    map.set(junta.id, getActiveMembersForJunta(junta, members).length);
  });
  return map;
}

export function isUserMember(params: { juntaId: string; userId?: string | null; members: JuntaMember[] }) {
  if (!params.userId) return false;
  return params.members.some((member) => (
    member.junta_id === params.juntaId
    && member.profile_id === params.userId
    && member.estado === 'activo'
  ));
}
