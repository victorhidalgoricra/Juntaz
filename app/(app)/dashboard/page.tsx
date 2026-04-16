'use client';

import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  buildJuntaScoreStatsFromDomain,
  getScoreBadge,
  type UserJuntaScoreResult,
  getUserJuntaScore
} from '@/services/junta-score.service';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { Junta, JuntaMember, Payment, PaymentSchedule, Payout } from '@/types/domain';

type PendingPaymentBannerData = {
  juntaId: string;
  cuotaId: string;
  juntaNombre: string;
  monto: number;
  dueDate: Date;
  isOverdue: boolean;
  hasMultiplePending: boolean;
};

type UpcomingPayoutData = {
  juntaId: string;
  juntaNombre: string;
  ronda: number;
  amount: number;
  fecha: Date | null;
};

type ContributionSummaryData = {
  totalAportado: number;
  periodLabel: string;
  fondoGarantia: number;
};

type JuntaCardData = {
  id: string;
  nombre: string;
  miembros: number;
  cuota: number;
  frecuencia: Junta['frecuencia_pago'];
  tipo: Junta['tipo_junta'];
  turno: number | null;
  nextDate: Date | null;
  status: 'pendiente' | 'al_dia';
};

type NextLevelData = {
  title: string;
  benefitText: string;
  currentScore: number;
  targetScore: number;
  missionText: string;
  missionCurrent: number;
  missionTarget: number;
};

function money(value: number) {
  return `S/ ${Math.round(value).toLocaleString('es-PE')}`;
}

function getDisplayName(nombre?: string, email?: string) {
  const fromNombre = (nombre ?? '').trim();
  if (fromNombre) return fromNombre;
  const fromEmail = (email ?? '').split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (fromEmail) return fromEmail.replace(/\b\w/g, (char) => char.toUpperCase());
  return 'Miembro';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getMyJuntaIds(userId: string, juntas: Junta[], members: JuntaMember[]) {
  const owned = juntas.filter((j) => j.admin_id === userId).map((j) => j.id);
  const memberOf = members.filter((m) => m.profile_id === userId).map((m) => m.junta_id);
  return Array.from(new Set([...owned, ...memberOf]));
}

function getPendingPaymentBanner(params: {
  juntas: Junta[];
  schedules: PaymentSchedule[];
  myJuntaIds: string[];
}): PendingPaymentBannerData | null {
  const today = new Date();
  const dueCandidates = params.schedules
    .filter((schedule) => params.myJuntaIds.includes(schedule.junta_id))
    .filter((schedule) => schedule.estado === 'pendiente' || schedule.estado === 'vencida')
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime());

  const nextDue = dueCandidates[0];
  if (!nextDue) return null;

  const junta = params.juntas.find((item) => item.id === nextDue.junta_id);
  if (!junta) return null;

  const dueDate = new Date(nextDue.fecha_vencimiento);
  return {
    juntaId: junta.id,
    cuotaId: nextDue.id,
    juntaNombre: junta.nombre,
    monto: nextDue.monto,
    dueDate,
    isOverdue: dueDate < today || nextDue.estado === 'vencida',
    hasMultiplePending: dueCandidates.length > 1
  };
}

function getUpcomingPayout(params: {
  payouts: Payout[];
  schedules: PaymentSchedule[];
  juntas: Junta[];
  userId: string;
}): UpcomingPayoutData | null {
  const userPayouts = params.payouts.filter((item) => item.profile_id === params.userId && !item.entregado_en);
  if (userPayouts.length === 0) return null;

  const mapped = userPayouts
    .map((payout) => {
      const junta = params.juntas.find((item) => item.id === payout.junta_id);
      const schedule = params.schedules.find((item) => item.junta_id === payout.junta_id && item.cuota_numero === payout.ronda_numero);
      return {
        payout,
        junta,
        date: schedule ? new Date(schedule.fecha_vencimiento) : null
      };
    })
    .filter((item) => item.junta)
    .sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER));

  const first = mapped[0];
  if (!first || !first.junta) return null;

  return {
    juntaId: first.junta.id,
    juntaNombre: first.junta.nombre,
    ronda: first.payout.ronda_numero,
    amount: first.payout.monto_pozo,
    fecha: first.date
  };
}

function getCurrentCycleContributionSummary(params: {
  userId: string;
  payments: Payment[];
  schedules: PaymentSchedule[];
  myJuntaIds: string[];
}): ContributionSummaryData {
  const approvedPayments = params.payments.filter((payment) => payment.profile_id === params.userId && payment.estado === 'approved');
  const totalAportado = approvedPayments.reduce((acc, payment) => acc + payment.monto, 0);
  const periodCount = params.schedules.filter((schedule) => params.myJuntaIds.includes(schedule.junta_id)).length;

  return {
    totalAportado,
    periodLabel: `${periodCount > 0 ? periodCount : 0} ${periodCount === 1 ? 'semana' : 'semanas'} · ciclo actual`,
    fondoGarantia: 0
  };
}

function getActiveJuntas(params: {
  juntas: Junta[];
  myJuntaIds: string[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  userId: string;
}): JuntaCardData[] {
  const myTurnMap = new Map(
    params.members.filter((member) => member.profile_id === params.userId).map((member) => [member.junta_id, member.orden_turno])
  );

  return params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id))
    .filter((junta) => junta.estado !== 'cerrada' && junta.estado !== 'bloqueada')
    .map((junta) => {
      const juntaSchedules = params.schedules.filter((schedule) => schedule.junta_id === junta.id);
      const hasPending = juntaSchedules.some((schedule) => schedule.estado === 'vencida' || schedule.estado === 'pendiente');
      const nextSchedule = juntaSchedules
        .slice()
        .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())[0];

      return {
        id: junta.id,
        nombre: junta.nombre,
        miembros: Number(junta.integrantes_actuales ?? junta.participantes_max ?? 0),
        cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
        frecuencia: junta.frecuencia_pago,
        tipo: junta.tipo_junta ?? 'normal',
        turno: myTurnMap.get(junta.id) ?? null,
        nextDate: nextSchedule ? new Date(nextSchedule.fecha_vencimiento) : null,
        status: hasPending ? 'pendiente' : 'al_dia'
      };
    });
}

function getJuntaHistory(params: { juntas: Junta[]; myJuntaIds: string[] }): JuntaCardData[] {
  return params.juntas
    .filter((junta) => params.myJuntaIds.includes(junta.id))
    .filter((junta) => junta.estado === 'cerrada' || junta.estado === 'bloqueada')
    .map((junta) => ({
      id: junta.id,
      nombre: junta.nombre,
      miembros: Number(junta.integrantes_actuales ?? junta.participantes_max ?? 0),
      cuota: Number(junta.cuota_base ?? junta.monto_cuota ?? 0),
      frecuencia: junta.frecuencia_pago,
      tipo: junta.tipo_junta ?? 'normal',
      turno: null,
      nextDate: null,
      status: 'al_dia' as const
    }));
}

function getNextLevelProgress(score: UserJuntaScoreResult): NextLevelData {
  const nextLevel = score.nextLevel ?? 'Élite';
  return {
    title: `Próximo nivel: ${nextLevel}`,
    benefitText: `+${score.pointsToNextLevel} pts para desbloquear beneficios adicionales para tu grupo.`,
    currentScore: score.score,
    targetScore: score.nextLevel ? score.score + score.pointsToNextLevel : 100,
    missionText: score.reasons[0] ?? 'Mantén tus pagos al día para seguir subiendo.',
    missionCurrent: Math.max(0, 2 - Math.min(2, score.warnings.length)),
    missionTarget: 2
  };
}

function DashboardHeader({ displayName }: { displayName: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          {getInitials(displayName)}
        </div>
        <div>
          <p className="text-sm text-slate-500">Buenos días</p>
          <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-full border border-slate-200 bg-white p-2 text-lg">🔔</button>
        <button type="button" className="rounded-full border border-slate-200 bg-white p-2 text-lg">⋯</button>
      </div>
    </div>
  );
}

function PendingPaymentBanner({ data }: { data: PendingPaymentBannerData }) {
  const isToday = format(data.dueDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dueLabel = isToday ? `vence hoy ${format(data.dueDate, 'HH:mm')}` : `vence ${format(data.dueDate, 'dd MMM', { locale: es })}`;
  const directHref = `/juntas/${data.juntaId}/registrar-pago?juntaId=${encodeURIComponent(data.juntaId)}&cuotaId=${encodeURIComponent(data.cuotaId)}&src=dashboard`;
  const fallbackHref = `/juntas/${data.juntaId}/payments`;

  return (
    <Link href={data.hasMultiplePending ? fallbackHref : directHref}>
      <Card className="border border-amber-300 bg-amber-100 p-4 hover:border-amber-400">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-200">⏺</div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{data.isOverdue ? 'Pago pendiente hoy' : 'Próximo pago'}</p>
              <p className="text-sm text-amber-900">{data.juntaNombre} · {money(data.monto)} · {dueLabel}</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-blue-700">Pagar →</p>
        </div>
      </Card>
    </Link>
  );
}

function JuntaScoreCard({ score }: { score: UserJuntaScoreResult }) {
  return (
    <Card className="rounded-3xl border-0 bg-[#171717] p-6 text-white shadow-lg">
      <div className="grid gap-4 md:grid-cols-[100px_1fr] md:items-center">
        <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-[6px] border-emerald-400">
          <p className="text-4xl font-bold leading-none">{score.score}</p>
          <p className="text-xs text-slate-300">/100</p>
        </div>
        <div className="space-y-2">
          <Badge className="bg-emerald-500/20 text-emerald-300">{getScoreBadge(score.level)}</Badge>
          <h2 className="text-3xl font-semibold">Tu score de junta</h2>
          <p className="text-sm text-slate-300">Pagos a tiempo, ciclos completados y referencias acumulan tu reputación financiera en la plataforma.</p>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${score.progressToNextLevel}%` }} />
            </div>
            <p className="text-xs text-slate-300">
              {score.pointsToNextLevel} pts para <span className="font-semibold text-white">{score.nextLevel ?? 'Élite'}</span>
            </p>
          </div>
          {score.warnings[0] && <p className="text-xs text-amber-300">{score.warnings[0]}</p>}
        </div>
      </div>
    </Card>
  );
}

function DashboardKpis({ paymentsOnTime, completedCycles, referredActive }: { paymentsOnTime: number; completedCycles: number; referredActive: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4 text-center"><p className="text-xl">📅</p><p className="text-3xl font-semibold text-emerald-600">{paymentsOnTime}%</p><p className="text-sm text-slate-500">Pagos a tiempo</p></Card>
      <Card className="p-4 text-center"><p className="text-xl">🔄</p><p className="text-3xl font-semibold">{completedCycles}</p><p className="text-sm text-slate-500">Ciclos completados</p></Card>
      <Card className="p-4 text-center"><p className="text-xl">👥</p><p className="text-3xl font-semibold">{referredActive}</p><p className="text-sm text-slate-500">Referidos activos</p></Card>
    </div>
  );
}

function UpcomingPayoutCard({ data }: { data: UpcomingPayoutData }) {
  return (
    <Link href={`/juntas/${data.juntaId}`}>
      <Card className="border border-emerald-300 bg-emerald-100 p-4 hover:border-emerald-400">
        <p className="text-sm text-emerald-700">Tu próximo cobro</p>
        <p className="text-4xl font-semibold text-emerald-900">{money(data.amount)}</p>
        <p className="text-sm text-emerald-800">
          Turno #{data.ronda} · {data.juntaNombre} · {data.fecha ? format(data.fecha, 'dd MMM yyyy', { locale: es }) : 'fecha por confirmar'}
        </p>
      </Card>
    </Link>
  );
}

function ContributionSummaryCards({ summary }: { summary: ContributionSummaryData }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="border-0 bg-blue-600 p-5 text-white">
        <p className="text-sm text-blue-100">Total aportado</p>
        <p className="text-4xl font-semibold">{money(summary.totalAportado)}</p>
        <p className="text-sm text-blue-100">{summary.periodLabel}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-slate-500">Fondo de garantía</p>
        <p className="text-4xl font-semibold text-slate-900">{money(summary.fondoGarantia)}</p>
        <p className="text-sm text-slate-500">Se devuelve al cerrar ciclo</p>
      </Card>
    </div>
  );
}

function JuntaListItem({ item }: { item: JuntaCardData }) {
  return (
    <Link href={`/juntas/${item.id}`}>
      <Card className="flex items-center justify-between gap-3 p-4 hover:border-slate-300">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">🚕</div>
          <div>
            <p className="font-semibold text-slate-900">{item.nombre}</p>
            <p className="text-sm text-slate-500">{item.miembros} integrantes · {money(item.cuota)}/{item.frecuencia} · {item.tipo === 'incentivo' ? 'con incentivos' : 'normal'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-blue-700">{item.turno ? `Turno #${item.turno}` : 'Turno pendiente'}</p>
          <p className="text-xs text-slate-500">{item.nextDate ? format(item.nextDate, 'dd MMM', { locale: es }) : 'Sin fecha'}</p>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.status === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {item.status === 'pendiente' ? 'Pago pendiente' : 'Al día'}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function ActiveJuntasSection({ active, history }: { active: JuntaCardData[]; history: JuntaCardData[] }) {
  const [tab, setTab] = useState<'activas' | 'historial'>('activas');
  const data = tab === 'activas' ? active : history;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Mis juntas activas</h2>
        <Link className="text-sm font-medium text-blue-700" href="/juntas">Ver todas →</Link>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('activas')} className={`rounded-xl border px-4 py-1.5 text-sm ${tab === 'activas' ? 'border-blue-600 text-blue-700' : 'border-slate-300 text-slate-600'}`}>Activas</button>
        <button type="button" onClick={() => setTab('historial')} className={`rounded-xl border px-4 py-1.5 text-sm ${tab === 'historial' ? 'border-blue-600 text-blue-700' : 'border-slate-300 text-slate-600'}`}>Historial</button>
      </div>

      {data.length === 0 ? (
        <Card className="p-5 text-sm text-slate-500">{tab === 'activas' ? 'Aún no tienes juntas activas. Únete o crea una junta para empezar.' : 'Todavía no tienes historial de juntas finalizadas.'}</Card>
      ) : (
        <div className="space-y-2">
          {data.map((item) => <JuntaListItem key={`${tab}-${item.id}`} item={item} />)}
        </div>
      )}
    </section>
  );
}

function NextLevelSection({ data }: { data: NextLevelData }) {
  const progressPct = Math.round((data.currentScore / data.targetScore) * 100);
  const missionPct = Math.round((data.missionCurrent / data.missionTarget) * 100);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">{data.title}</h2>
      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">⭐</div>
          <div className="flex-1">
            <p className="text-sm text-blue-900">{data.benefitText}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-200">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs font-medium text-blue-700">{data.currentScore}/{data.targetScore}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-slate-700">{data.missionText}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-500" style={{ width: `${missionPct}%` }} />
          </div>
          <p className="text-xs text-slate-500">{data.missionCurrent}/{data.missionTarget}</p>
        </div>
      </Card>
    </section>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { juntas, schedules, payments, members, payouts } = useAppStore();

  if (!user) return <Card>Necesitas iniciar sesión para ver tu dashboard.</Card>;

  const safeJuntas = Array.isArray(juntas) ? juntas : [];
  const safeSchedules = Array.isArray(schedules) ? schedules : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeMembers = Array.isArray(members) ? members : [];
  const safePayouts = Array.isArray(payouts) ? payouts : [];

  const myJuntaIds = getMyJuntaIds(user.id, safeJuntas, safeMembers);
  const displayName = getDisplayName(user.nombre, user.email);

  const pendingPaymentBanner = getPendingPaymentBanner({
    juntas: safeJuntas,
    schedules: safeSchedules,
    myJuntaIds
  });

  const scoreStats = buildJuntaScoreStatsFromDomain({
    userId: user.id,
    juntas: safeJuntas,
    members: safeMembers,
    payments: safePayments,
    schedules: safeSchedules
  });

  const score = getUserJuntaScore(user.id, scoreStats);

  const upcomingPayout = getUpcomingPayout({
    userId: user.id,
    payouts: safePayouts,
    schedules: safeSchedules,
    juntas: safeJuntas
  });

  const contributionSummary = getCurrentCycleContributionSummary({
    userId: user.id,
    payments: safePayments,
    schedules: safeSchedules,
    myJuntaIds
  });

  const activeJuntas = getActiveJuntas({
    juntas: safeJuntas,
    myJuntaIds,
    members: safeMembers,
    schedules: safeSchedules,
    userId: user.id
  });

  const historyJuntas = getJuntaHistory({
    juntas: safeJuntas,
    myJuntaIds
  });

  const approvedCount = scoreStats.onTimePaymentsRecent + scoreStats.onTimePaymentsLifetime;
  const lateCount = scoreStats.latePaymentsRecent + scoreStats.defaultPaymentsRecent;
  const paymentRate = approvedCount + lateCount > 0 ? Math.round((approvedCount / (approvedCount + lateCount)) * 100) : 0;
  const completedCycles = safeJuntas.filter((junta) => myJuntaIds.includes(junta.id) && junta.estado === 'cerrada').length;
  const nextLevel = getNextLevelProgress(score);

  return (
    <div className="space-y-5">
      <DashboardHeader displayName={displayName} />

      {pendingPaymentBanner && <PendingPaymentBanner data={pendingPaymentBanner} />}

      <JuntaScoreCard score={score} />

      <DashboardKpis paymentsOnTime={paymentRate} completedCycles={completedCycles} referredActive={0} />

      {upcomingPayout && <UpcomingPayoutCard data={upcomingPayout} />}

      <ContributionSummaryCards summary={contributionSummary} />

      <ActiveJuntasSection active={activeJuntas} history={historyJuntas} />

      <NextLevelSection data={nextLevel} />

      <div className="flex gap-2">
        <Link href="/juntas/new"><Button>Crear nueva junta</Button></Link>
        <Link href="/juntas"><Button variant="outline">Explorar juntas</Button></Link>
      </div>
    </div>
  );
}
