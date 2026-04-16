import { Junta, JuntaMember, Payment, PaymentSchedule } from '@/types/domain';

export type JuntaScoreLevel = 'Nuevo' | 'Bronce' | 'Plata' | 'Oro' | 'Élite';

export type JuntaScoreStats = {
  onTimePaymentsThisWeek: number;
  latePaymentsThisWeek: number;
  onTimePaymentsRecent: number;
  latePaymentsRecent: number;
  defaultPaymentsRecent: number;
  onTimePaymentsLifetime: number;
  latePaymentsLifetime: number;
  defaultPaymentsLifetime: number;
  completedCycles: number;
  activeStreakWeeks: number;
  successfulReferrals: number;
  validatedReferences: number;
  healthyActions: number;
  abandonedMidCycleCount: number;
  suspiciousAbuseAttempts: number;
};

type ScoreConfig = {
  weights: {
    punctuality: number;
    completedCycles: number;
    consistency: number;
    referrals: number;
    healthyBehavior: number;
  };
  levels: Array<{ level: JuntaScoreLevel; min: number; max: number; badge: string }>;
  caps: {
    referrals: number;
    references: number;
    healthyActions: number;
    streakWeeks: number;
    completedCycles: number;
  };
  penalties: {
    latePayment: number;
    defaultPayment: number;
    abandonedMidCycle: number;
    suspiciousAbuse: number;
  };
  windows: {
    recentDays: number;
  };
};

export const JUNTA_SCORE_CONFIG: ScoreConfig = {
  weights: {
    punctuality: 50,
    completedCycles: 20,
    consistency: 15,
    referrals: 10,
    healthyBehavior: 5
  },
  levels: [
    { level: 'Nuevo', min: 0, max: 29, badge: '🟢 Nuevo' },
    { level: 'Bronce', min: 30, max: 49, badge: '🥉 Bronce' },
    { level: 'Plata', min: 50, max: 69, badge: '🥈 Plata' },
    { level: 'Oro', min: 70, max: 84, badge: '🥇 Oro' },
    { level: 'Élite', min: 85, max: 100, badge: '💎 Élite' }
  ],
  caps: {
    referrals: 4,
    references: 3,
    healthyActions: 5,
    streakWeeks: 12,
    completedCycles: 6
  },
  penalties: {
    latePayment: 3,
    defaultPayment: 8,
    abandonedMidCycle: 7,
    suspiciousAbuse: 10
  },
  windows: {
    recentDays: 90
  }
};

export type JuntaScoreBreakdown = {
  punctuality: number;
  completedCycles: number;
  consistency: number;
  referrals: number;
  healthyBehavior: number;
  penalties: number;
};

export type UserJuntaScoreResult = {
  score: number;
  level: JuntaScoreLevel;
  progressToNextLevel: number;
  nextLevel: JuntaScoreLevel | null;
  pointsToNextLevel: number;
  breakdown: JuntaScoreBreakdown;
  reasons: string[];
  warnings: string[];
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function toScore(value: number) {
  return Math.round(clamp(value));
}

export function getScoreLevel(score: number): JuntaScoreLevel {
  const safeScore = clamp(score);
  return JUNTA_SCORE_CONFIG.levels.find((tier) => safeScore >= tier.min && safeScore <= tier.max)?.level ?? 'Nuevo';
}

export function getNextLevel(score: number): JuntaScoreLevel | null {
  const safeScore = clamp(score);
  return JUNTA_SCORE_CONFIG.levels.find((tier) => safeScore < tier.min)?.level ?? null;
}

export function getPointsToNextLevel(score: number): number {
  const safeScore = clamp(score);
  const next = JUNTA_SCORE_CONFIG.levels.find((tier) => safeScore < tier.min);
  if (!next) return 0;
  return Math.max(0, next.min - safeScore);
}

export function getScoreBadge(level: JuntaScoreLevel): string {
  return JUNTA_SCORE_CONFIG.levels.find((tier) => tier.level === level)?.badge ?? '🟢 Nuevo';
}

export function getScoreProgress(score: number): number {
  return toScore(clamp(score));
}

export function getUserJuntaScore(userId: string, stats: JuntaScoreStats): UserJuntaScoreResult {
  const recentWeightedTotal =
    stats.onTimePaymentsRecent +
    (stats.latePaymentsRecent * 1.25) +
    (stats.defaultPaymentsRecent * 1.75);

  const lifetimeWeightedTotal =
    stats.onTimePaymentsLifetime +
    (stats.latePaymentsLifetime * 1.15) +
    (stats.defaultPaymentsLifetime * 1.5);

  const punctualityRecent = ratio(stats.onTimePaymentsRecent, recentWeightedTotal || 1);
  const punctualityLifetime = ratio(stats.onTimePaymentsLifetime, lifetimeWeightedTotal || 1);
  const punctualityComposite = (punctualityRecent * 0.7) + (punctualityLifetime * 0.3);

  const punctualityScore = punctualityComposite * JUNTA_SCORE_CONFIG.weights.punctuality;
  const completedCyclesScore =
    ratio(Math.min(stats.completedCycles, JUNTA_SCORE_CONFIG.caps.completedCycles), JUNTA_SCORE_CONFIG.caps.completedCycles)
    * JUNTA_SCORE_CONFIG.weights.completedCycles;
  const consistencyScore =
    ratio(Math.min(stats.activeStreakWeeks, JUNTA_SCORE_CONFIG.caps.streakWeeks), JUNTA_SCORE_CONFIG.caps.streakWeeks)
    * JUNTA_SCORE_CONFIG.weights.consistency;

  const referralUnits =
    Math.min(stats.successfulReferrals, JUNTA_SCORE_CONFIG.caps.referrals)
    + Math.min(stats.validatedReferences, JUNTA_SCORE_CONFIG.caps.references);
  const referralCap = JUNTA_SCORE_CONFIG.caps.referrals + JUNTA_SCORE_CONFIG.caps.references;
  const referralsScore = ratio(referralUnits, referralCap) * JUNTA_SCORE_CONFIG.weights.referrals;

  const healthyBehaviorBase = ratio(
    Math.min(stats.healthyActions, JUNTA_SCORE_CONFIG.caps.healthyActions),
    JUNTA_SCORE_CONFIG.caps.healthyActions
  ) * JUNTA_SCORE_CONFIG.weights.healthyBehavior;

  const penaltyPoints =
    (stats.latePaymentsRecent * JUNTA_SCORE_CONFIG.penalties.latePayment)
    + (stats.defaultPaymentsRecent * JUNTA_SCORE_CONFIG.penalties.defaultPayment)
    + (stats.abandonedMidCycleCount * JUNTA_SCORE_CONFIG.penalties.abandonedMidCycle)
    + (stats.suspiciousAbuseAttempts * JUNTA_SCORE_CONFIG.penalties.suspiciousAbuse);

  const rawScore = punctualityScore + completedCyclesScore + consistencyScore + referralsScore + healthyBehaviorBase - penaltyPoints;
  const score = toScore(rawScore);
  const level = getScoreLevel(score);
  const nextLevel = getNextLevel(score);
  const pointsToNextLevel = getPointsToNextLevel(score);

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (stats.onTimePaymentsRecent > 0) {
    reasons.push(`${stats.onTimePaymentsRecent} pagos recientes en fecha fortalecen tu reputación.`);
  }
  if (stats.completedCycles > 0) {
    reasons.push(`${stats.completedCycles} ciclo(s) completado(s) aumentan tu confianza en la plataforma.`);
  }
  if (stats.activeStreakWeeks >= 2) {
    reasons.push(`Racha activa de ${stats.activeStreakWeeks} semana(s) con participación consistente.`);
  }
  if (referralUnits > 0) {
    reasons.push('Tus referencias validadas y referidos exitosos suman puntos (con tope anti-abuso).');
  }

  if (stats.latePaymentsRecent > 0) {
    warnings.push(`${stats.latePaymentsRecent} pago(s) tarde reciente(s) reducen tu score.`);
  }
  if (stats.defaultPaymentsRecent > 0) {
    warnings.push(`${stats.defaultPaymentsRecent} incumplimiento(s) reciente(s) impactan fuertemente tu reputación.`);
  }
  if (stats.abandonedMidCycleCount > 0) {
    warnings.push('Salir de juntas a mitad de ciclo reduce tu confiabilidad para próximos grupos.');
  }
  if (stats.suspiciousAbuseAttempts > 0) {
    warnings.push('Se detectaron señales de comportamiento inusual y se aplicó penalización preventiva.');
  }

  return {
    score,
    level,
    progressToNextLevel: getScoreProgress(score),
    nextLevel,
    pointsToNextLevel,
    breakdown: {
      punctuality: toScore(punctualityScore),
      completedCycles: toScore(completedCyclesScore),
      consistency: toScore(consistencyScore),
      referrals: toScore(referralsScore),
      healthyBehavior: toScore(healthyBehaviorBase),
      penalties: toScore(penaltyPoints)
    },
    reasons,
    warnings
  };
}

export function buildJuntaScoreStatsFromDomain(params: {
  userId: string;
  juntas: Junta[];
  members: JuntaMember[];
  payments: Payment[];
  schedules: PaymentSchedule[];
  successfulReferrals?: number;
  validatedReferences?: number;
  healthyActions?: number;
  now?: Date;
}): JuntaScoreStats {
  const now = params.now ?? new Date();
  const recentFrom = new Date(now);
  recentFrom.setDate(recentFrom.getDate() - JUNTA_SCORE_CONFIG.windows.recentDays);
  const weekFrom = new Date(now);
  weekFrom.setDate(weekFrom.getDate() - 7);

  const myJuntaIds = new Set([
    ...params.juntas.filter((junta) => junta.admin_id === params.userId).map((junta) => junta.id),
    ...params.members.filter((member) => member.profile_id === params.userId).map((member) => member.junta_id)
  ]);

  const myPayments = params.payments.filter((payment) => payment.profile_id === params.userId && myJuntaIds.has(payment.junta_id));
  const paymentBySchedule = new Map(myPayments.map((payment) => [`${payment.junta_id}-${payment.schedule_id}`, payment]));
  const relevantSchedules = params.schedules.filter((schedule) => myJuntaIds.has(schedule.junta_id));

  let onTimePaymentsRecent = 0;
  let latePaymentsRecent = 0;
  let defaultPaymentsRecent = 0;
  let onTimePaymentsThisWeek = 0;
  let latePaymentsThisWeek = 0;
  let onTimePaymentsLifetime = 0;
  let latePaymentsLifetime = 0;
  let defaultPaymentsLifetime = 0;

  relevantSchedules.forEach((schedule) => {
    const dueDate = new Date(schedule.fecha_vencimiento);
    const key = `${schedule.junta_id}-${schedule.id}`;
    const payment = paymentBySchedule.get(key);
    const isRecent = dueDate >= recentFrom;
    const isThisWeek = dueDate >= weekFrom;

    const paidAt = payment?.validated_at ?? payment?.submitted_at ?? payment?.pagado_en;
    const paidDate = paidAt ? new Date(paidAt) : null;

    if (payment?.estado === 'approved') {
      const isLate = Boolean(paidDate && paidDate.getTime() > dueDate.getTime());
      if (isLate) {
        latePaymentsLifetime += 1;
        if (isRecent) latePaymentsRecent += 1;
        if (isThisWeek) latePaymentsThisWeek += 1;
      } else {
        onTimePaymentsLifetime += 1;
        if (isRecent) onTimePaymentsRecent += 1;
        if (isThisWeek) onTimePaymentsThisWeek += 1;
      }
      return;
    }

    const isDefault = schedule.estado === 'vencida' || dueDate < now;
    if (isDefault) {
      defaultPaymentsLifetime += 1;
      if (isRecent) defaultPaymentsRecent += 1;
      if (isThisWeek) latePaymentsThisWeek += 1;
    }
  });

  const completedCycles = params.juntas.filter((junta) => myJuntaIds.has(junta.id) && junta.estado === 'cerrada').length;

  const approvedDates = myPayments
    .filter((payment) => payment.estado === 'approved')
    .map((payment) => new Date(payment.validated_at ?? payment.submitted_at ?? payment.pagado_en).getTime())
    .sort((a, b) => a - b);

  let activeStreakWeeks = 0;
  for (let i = approvedDates.length - 1; i >= 0; i -= 1) {
    if (i === approvedDates.length - 1) {
      activeStreakWeeks = 1;
      continue;
    }
    const deltaDays = (approvedDates[i + 1] - approvedDates[i]) / (1000 * 60 * 60 * 24);
    if (deltaDays <= 10) activeStreakWeeks += 1;
    else break;
  }

  const abandonedMidCycleCount = params.members.filter(
    (member) => member.profile_id === params.userId && member.estado === 'retirado'
  ).length;

  const suspiciousAbuseAttempts = myPayments.filter((payment) => {
    const note = `${payment.internal_note ?? ''} ${payment.rejection_reason ?? ''}`.toLowerCase();
    return note.includes('fraude') || note.includes('sospech') || note.includes('abuso');
  }).length;

  return {
    onTimePaymentsThisWeek,
    latePaymentsThisWeek,
    onTimePaymentsRecent,
    latePaymentsRecent,
    defaultPaymentsRecent,
    onTimePaymentsLifetime,
    latePaymentsLifetime,
    defaultPaymentsLifetime,
    completedCycles,
    activeStreakWeeks,
    successfulReferrals: params.successfulReferrals ?? 0,
    validatedReferences: params.validatedReferences ?? 0,
    healthyActions: params.healthyActions ?? Math.max(0, 5 - abandonedMidCycleCount),
    abandonedMidCycleCount,
    suspiciousAbuseAttempts
  };
}
