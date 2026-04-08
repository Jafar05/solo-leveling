import { ActionLog, DailyStats, Stat, StatKey } from './types';
import { ALL_STAT_KEYS } from './types';

export interface StatBehavior {
  stat: StatKey;
  daysWithoutActivity: number;
  actionsLast30: number;
  shareOfTotal: number;        // % от всех действий за 30 дней
  avgDifficultyScore: number;  // 0=easy, 0.5=normal, 1=hard
  trend: 'hot' | 'active' | 'cooling' | 'neglected' | 'virgin';
}

export interface BehavioralProfile {
  neglectedStats: StatKey[];    // 7+ дней без активности, но есть история
  virginStats: StatKey[];       // вообще никогда не логировал
  dominantStats: StatKey[];     // топ-2 по количеству действий
  comfortZoneStats: StatKey[];  // avg difficulty < 0.35 (в основном easy)
  hotStreakStats: StatKey[];    // активны в последние 3 дня
  consistencyScore: number;    // 0-100, % активных дней за 14 дней
  balanceScore: number;        // 0-100, насколько равномерно прокачивается
  difficultyBreakdown: { easy: number; normal: number; hard: number };
  statBehaviors: StatBehavior[];
  totalActionsLast30: number;
  activeDaysLast14: number;
  focusSuggestion: StatKey[];  // топ-3 стата, куда нужно направить усилия
}

const DIFF_SCORE: Record<string, number> = { easy: 0, normal: 0.5, hard: 1 };
const MS_PER_DAY = 86_400_000;

function daysAgo(timestamp: number | null): number {
  if (!timestamp) return 9999;
  return Math.floor((Date.now() - timestamp) / MS_PER_DAY);
}

export function buildBehavioralProfile(
  actionLogs: ActionLog[],
  stats: Record<StatKey, Stat>,
  dailyStats: DailyStats[]
): BehavioralProfile {
  const now = Date.now();
  const cutoff30 = now - 30 * MS_PER_DAY;
  const cutoff3 = now - 3 * MS_PER_DAY;

  const recent = actionLogs.filter((l) => l.createdAt >= cutoff30);
  const totalActionsLast30 = recent.length;

  // ── Per-stat behavior ────────────────────────────────────────────────────────
  const statBehaviors: StatBehavior[] = ALL_STAT_KEYS.map((stat) => {
    const statActions = recent.filter((l) => l.stat === stat);
    const allTimeActions = actionLogs.filter((l) => l.stat === stat);
    const daysWithout = daysAgo(stats[stat].lastActivityAt);

    const avgDiff =
      statActions.length === 0
        ? 0
        : statActions.reduce((s, a) => s + (DIFF_SCORE[a.difficulty] ?? 0.5), 0) /
          statActions.length;

    const shareOfTotal =
      totalActionsLast30 === 0 ? 0 : statActions.length / totalActionsLast30;

    let trend: StatBehavior['trend'];
    if (allTimeActions.length === 0) {
      trend = 'virgin';
    } else if (daysWithout >= 7) {
      trend = 'neglected';
    } else if (daysWithout >= 4) {
      trend = 'cooling';
    } else if (stats[stat].lastActivityAt && stats[stat].lastActivityAt! >= cutoff3) {
      trend = 'hot';
    } else {
      trend = 'active';
    }

    return {
      stat,
      daysWithoutActivity: daysWithout === 9999 ? -1 : daysWithout,
      actionsLast30: statActions.length,
      shareOfTotal,
      avgDifficultyScore: avgDiff,
      trend,
    };
  });

  // ── Derived groups ────────────────────────────────────────────────────────────
  const neglectedStats = statBehaviors
    .filter((s) => s.trend === 'neglected')
    .map((s) => s.stat);

  const virginStats = statBehaviors
    .filter((s) => s.trend === 'virgin')
    .map((s) => s.stat);

  const dominantStats = [...statBehaviors]
    .sort((a, b) => b.actionsLast30 - a.actionsLast30)
    .slice(0, 2)
    .filter((s) => s.shareOfTotal > 0.25)
    .map((s) => s.stat);

  const comfortZoneStats = statBehaviors
    .filter((s) => s.actionsLast30 >= 3 && s.avgDifficultyScore < 0.35)
    .map((s) => s.stat);

  const hotStreakStats = statBehaviors
    .filter((s) => s.trend === 'hot')
    .map((s) => s.stat);

  // ── Consistency (активных дней из последних 14) ───────────────────────────────
  const cutoff14 = now - 14 * MS_PER_DAY;
  const activeDaysLast14 = dailyStats.filter((d) => {
    const ts = new Date(d.date).getTime();
    return ts >= cutoff14 && ts <= now;
  }).length;
  const consistencyScore = Math.round((activeDaysLast14 / 14) * 100);

  // ── Balance score (энтропия распределения) ────────────────────────────────────
  const shares = statBehaviors.map((s) => s.shareOfTotal).filter((v) => v > 0);
  let entropy = 0;
  const maxEntropy = Math.log(ALL_STAT_KEYS.length);
  if (shares.length > 0 && maxEntropy > 0) {
    shares.forEach((p) => {
      if (p > 0) entropy -= p * Math.log(p);
    });
  }
  const balanceScore = Math.round((entropy / maxEntropy) * 100);

  // ── Difficulty breakdown ──────────────────────────────────────────────────────
  const total = recent.length || 1;
  const difficultyBreakdown = {
    easy: Math.round((recent.filter((l) => l.difficulty === 'easy').length / total) * 100),
    normal: Math.round((recent.filter((l) => l.difficulty === 'normal').length / total) * 100),
    hard: Math.round((recent.filter((l) => l.difficulty === 'hard').length / total) * 100),
  };

  // ── Focus suggestion (что прокачивать) ───────────────────────────────────────
  // Приоритет: virgin > neglected > cooling > comfort zone
  const prioritized = [...statBehaviors].sort((a, b) => {
    const score = (s: StatBehavior) => {
      if (s.trend === 'virgin') return 4;
      if (s.trend === 'neglected') return 3;
      if (s.trend === 'cooling') return 2;
      if (comfortZoneStats.includes(s.stat)) return 1;
      return 0;
    };
    return score(b) - score(a);
  });
  const focusSuggestion = prioritized.slice(0, 3).map((s) => s.stat);

  return {
    neglectedStats,
    virginStats,
    dominantStats,
    comfortZoneStats,
    hotStreakStats,
    consistencyScore,
    balanceScore,
    difficultyBreakdown,
    statBehaviors,
    totalActionsLast30,
    activeDaysLast14,
    focusSuggestion,
  };
}

// Строит текстовый summary профиля для инъекции в AI-промпт
export function buildProfileSummaryForAI(profile: BehavioralProfile): string {
  const lines: string[] = ['ПОВЕДЕНЧЕСКИЙ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:'];

  if (profile.virginStats.length > 0) {
    lines.push(`- Никогда не прокачивал: ${profile.virginStats.join(', ').toUpperCase()}`);
  }
  if (profile.neglectedStats.length > 0) {
    lines.push(`- Запущено (7+ дней без активности): ${profile.neglectedStats.join(', ').toUpperCase()}`);
  }
  if (profile.dominantStats.length > 0) {
    lines.push(`- Перекачивает (слишком много): ${profile.dominantStats.join(', ').toUpperCase()}`);
  }
  if (profile.comfortZoneStats.length > 0) {
    lines.push(`- Зона комфорта (всё на easy): ${profile.comfortZoneStats.join(', ').toUpperCase()}`);
  }
  if (profile.hotStreakStats.length > 0) {
    lines.push(`- Горячий стрик сейчас: ${profile.hotStreakStats.join(', ').toUpperCase()}`);
  }

  lines.push(`- Стабильность: ${profile.activeDaysLast14}/14 активных дней (${profile.consistencyScore}%)`);
  lines.push(`- Баланс развития: ${profile.balanceScore}/100`);
  lines.push(
    `- Распределение сложности: easy ${profile.difficultyBreakdown.easy}%, normal ${profile.difficultyBreakdown.normal}%, hard ${profile.difficultyBreakdown.hard}%`
  );

  if (profile.focusSuggestion.length > 0) {
    lines.push(`\nПРИОРИТЕТ: Делай упор на статы: ${profile.focusSuggestion.join(', ').toUpperCase()}`);
    if (profile.comfortZoneStats.length > 0) {
      lines.push(`Для статов в зоне комфорта (${profile.comfortZoneStats.join(', ')}) — предлагай сложность выше обычного.`);
    }
    if (profile.dominantStats.length > 0) {
      lines.push(`Не перегружай ${profile.dominantStats.join(', ')} — пользователь уже там силён.`);
    }
  }

  return lines.join('\n');
}
