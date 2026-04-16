import {
  getUserJuntaScore,
  JUNTA_SCORE_CONFIG,
  JuntaScoreLevel,
  JuntaScoreStats,
  UserJuntaScoreResult
} from '@/services/junta-score.service';

export type MissionStatus = 'locked' | 'in_progress' | 'completed';

export type JuntaMission = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  progressCurrent: number;
  progressTarget: number;
  status: MissionStatus;
};

export type LevelUnlocks = {
  maxJuntaMembers: number;
  maxContributionPerRound: number;
  incentiveJuntasEnabled: boolean;
  priorityVisibility: boolean;
  trustedBadge: boolean;
  statusSignal: string;
};

export type JuntaEngagementLayer = {
  currentLevel: JuntaScoreLevel;
  nextLevel: JuntaScoreLevel | null;
  pointsRemainingToNextLevel: number;
  nextLevelUnlocks: LevelUnlocks | null;
  currentLevelUnlocks: LevelUnlocks;
  featuredMission: JuntaMission;
  missions: JuntaMission[];
  progressBarPct: number;
  levelDropWarning: string | null;
  causeAndEffect: {
    gainIfPayToday: string;
    lossIfLateToday: string;
  };
};

export const LEVEL_UNLOCKS_CONFIG: Record<JuntaScoreLevel, LevelUnlocks> = {
  Nuevo: {
    maxJuntaMembers: 8,
    maxContributionPerRound: 400,
    incentiveJuntasEnabled: false,
    priorityVisibility: false,
    trustedBadge: false,
    statusSignal: 'Inicial'
  },
  Bronce: {
    maxJuntaMembers: 12,
    maxContributionPerRound: 700,
    incentiveJuntasEnabled: false,
    priorityVisibility: false,
    trustedBadge: false,
    statusSignal: 'Estable'
  },
  Plata: {
    maxJuntaMembers: 18,
    maxContributionPerRound: 1200,
    incentiveJuntasEnabled: true,
    priorityVisibility: false,
    trustedBadge: true,
    statusSignal: 'Confiable'
  },
  Oro: {
    maxJuntaMembers: 25,
    maxContributionPerRound: 2000,
    incentiveJuntasEnabled: true,
    priorityVisibility: true,
    trustedBadge: true,
    statusSignal: 'Avanzado'
  },
  Élite: {
    maxJuntaMembers: 40,
    maxContributionPerRound: 3500,
    incentiveJuntasEnabled: true,
    priorityVisibility: true,
    trustedBadge: true,
    statusSignal: 'Top confianza'
  }
};

const MISSION_REWARDS = {
  payOnTimeThisWeek: 3,
  completeCurrentCycle: 8,
  referOneActiveMember: 5,
  keepOnTimeStreak: 6
};

const DROP_WARNING_BUFFER_POINTS = 5;

function getMissionStatus(current: number, target: number): MissionStatus {
  if (target <= 0) return 'locked';
  if (current >= target) return 'completed';
  return 'in_progress';
}

function getMissions(stats: JuntaScoreStats): JuntaMission[] {
  const missions: JuntaMission[] = [
    {
      id: 'pay_on_time_this_week',
      title: 'Paga a tiempo esta semana',
      description: 'Confirma tu cuota de la semana antes del vencimiento.',
      rewardPoints: MISSION_REWARDS.payOnTimeThisWeek,
      progressCurrent: Math.min(stats.onTimePaymentsThisWeek, 1),
      progressTarget: 1,
      status: getMissionStatus(Math.min(stats.onTimePaymentsThisWeek, 1), 1)
    },
    {
      id: 'complete_current_cycle',
      title: 'Completa tu ciclo actual',
      description: 'Termina una junta activa sin atrasos para subir confianza.',
      rewardPoints: MISSION_REWARDS.completeCurrentCycle,
      progressCurrent: Math.min(stats.completedCycles, 1),
      progressTarget: 1,
      status: getMissionStatus(Math.min(stats.completedCycles, 1), 1)
    },
    {
      id: 'refer_one_active_member',
      title: 'Refiere 1 miembro activo',
      description: 'Invita a alguien que se una y participe en una junta.',
      rewardPoints: MISSION_REWARDS.referOneActiveMember,
      progressCurrent: Math.min(stats.successfulReferrals, 1),
      progressTarget: 1,
      status: getMissionStatus(Math.min(stats.successfulReferrals, 1), 1)
    },
    {
      id: 'on_time_streak_4_rounds',
      title: 'Mantén 4 rondas puntuales',
      description: 'Sostén pagos puntuales en 4 rondas consecutivas.',
      rewardPoints: MISSION_REWARDS.keepOnTimeStreak,
      progressCurrent: Math.min(stats.activeStreakWeeks, 4),
      progressTarget: 4,
      status: getMissionStatus(Math.min(stats.activeStreakWeeks, 4), 4)
    }
  ];

  return missions;
}

function getFeaturedMission(missions: JuntaMission[]) {
  return missions.find((mission) => mission.status === 'in_progress')
    ?? missions.find((mission) => mission.status === 'locked')
    ?? missions[0];
}

function getLevelDropWarning(score: UserJuntaScoreResult): string | null {
  const currentTier = JUNTA_SCORE_CONFIG.levels.find((tier) => tier.level === score.level);
  if (!currentTier) return null;

  const pointsOverFloor = score.score - currentTier.min;
  if (pointsOverFloor > DROP_WARNING_BUFFER_POINTS) return null;

  return `Estás a ${pointsOverFloor} pts del mínimo de ${score.level}. Mantén pagos puntuales para no bajar de nivel.`;
}

function getCauseAndEffect(userId: string, stats: JuntaScoreStats, score: UserJuntaScoreResult) {
  const ifPayToday = getUserJuntaScore(userId, {
    ...stats,
    onTimePaymentsThisWeek: stats.onTimePaymentsThisWeek + 1,
    onTimePaymentsRecent: stats.onTimePaymentsRecent + 1,
    onTimePaymentsLifetime: stats.onTimePaymentsLifetime + 1
  });

  const ifLateToday = getUserJuntaScore(userId, {
    ...stats,
    latePaymentsThisWeek: stats.latePaymentsThisWeek + 1,
    latePaymentsRecent: stats.latePaymentsRecent + 1
  });

  const gain = Math.max(0, ifPayToday.score - score.score);
  const loss = Math.max(0, score.score - ifLateToday.score);

  return {
    gainIfPayToday: `Si pagas hoy, subes ${gain} punto${gain === 1 ? '' : 's'}.`,
    lossIfLateToday: `Si te retrasas, podrías perder ${loss} punto${loss === 1 ? '' : 's'}.`
  };
}

export function getJuntaEngagementLayer(params: {
  userId: string;
  score: UserJuntaScoreResult;
  stats: JuntaScoreStats;
}): JuntaEngagementLayer {
  const missions = getMissions(params.stats);
  const featuredMission = getFeaturedMission(missions);

  return {
    currentLevel: params.score.level,
    nextLevel: params.score.nextLevel,
    pointsRemainingToNextLevel: params.score.pointsToNextLevel,
    nextLevelUnlocks: params.score.nextLevel ? LEVEL_UNLOCKS_CONFIG[params.score.nextLevel] : null,
    currentLevelUnlocks: LEVEL_UNLOCKS_CONFIG[params.score.level],
    featuredMission,
    missions,
    progressBarPct: Math.round((featuredMission.progressCurrent / featuredMission.progressTarget) * 100),
    levelDropWarning: getLevelDropWarning(params.score),
    causeAndEffect: getCauseAndEffect(params.userId, params.stats, params.score)
  };
}
