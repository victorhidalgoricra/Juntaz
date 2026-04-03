'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { calcularPozo } from '@/services/junta.service';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const { juntas, schedules, payments } = useAppStore();
  const admin = juntas.filter((j) => j.admin_id === user.id);
  const member = juntas.filter((j) => j.admin_id !== user.id);

  const pagadas = payments.filter((p) => p.estado === 'aprobado').length;
  const vencidas = schedules.filter((s) => s.estado === 'vencida').length;
  const totalAportado = payments.filter((p) => p.profile_id === user.id && p.estado === 'aprobado').reduce((a, p) => a + p.monto, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Cuotas pagadas</p><p className="text-2xl font-bold">{pagadas}</p></Card>
        <Card><p className="text-sm text-slate-500">Cuotas vencidas</p><p className="text-2xl font-bold">{vencidas}</p></Card>
        <Card><p className="text-sm text-slate-500">Total aportado</p><p className="text-2xl font-bold">S/ {totalAportado}</p></Card>
        <Card><p className="text-sm text-slate-500">Próximo turno</p><p className="text-lg font-semibold">Ronda 1</p></Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Actividad</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[{ nombre: 'Pagadas', valor: pagadas }, { nombre: 'Vencidas', valor: vencidas }]}>
            <XAxis dataKey="nombre" />
            <YAxis />
            <Bar dataKey="valor" fill="#1d4ed8" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Juntas que administro</h2><Button><Link href="/juntas/new">Nueva junta</Link></Button></div>
        <div className="grid gap-3 md:grid-cols-2">
          {admin.length === 0 ? <Card>Sin juntas aún.</Card> : admin.map((j) => {
            const next = schedules.find((s) => s.junta_id === j.id);
            return (
              <Card key={j.id}>
                <Link href={`/juntas/${j.id}`} className="font-semibold">{j.nombre}</Link>
                <p className="text-sm text-slate-500">Próximo pago: {next ? format(new Date(next.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}</p>
                <p className="text-sm">Pozo: S/ {calcularPozo(j)}</p>
                <Badge>{j.estado}</Badge>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Juntas donde participo</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {member.length === 0 ? <Card>No participas en otras juntas.</Card> : member.map((j) => <Card key={j.id}>{j.nombre}</Card>)}
        </div>
      </section>
    </div>
  );
}
