import { StatKey, Difficulty, Rank, Stat, ActionLog, Character, ALL_STAT_KEYS } from './types';

// ─── Уровни ───────────────────────────────────────────────────────────────────

export function xpNeededForLevel(level: number): number {
  return Math.floor(150 * Math.pow(1.15, level));
}

export function totalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpNeededForLevel(i);
  }
  return total;
}

export function levelFromTotalXP(totalXP: number): { level: number; currentXP: number; neededXP: number } {
  let level = 1;
  let remaining = totalXP;

  while (remaining >= xpNeededForLevel(level)) {
    remaining -= xpNeededForLevel(level);
    level++;
  }

  return {
    level,
    currentXP: remaining,
    neededXP: xpNeededForLevel(level),
  };
}

export function characterLevel(stats: Record<StatKey, Stat>): number {
  const statKeys = ALL_STAT_KEYS;
  const avg = statKeys.reduce((sum, k) => sum + stats[k].level, 0) / statKeys.length;

  // Бонус за гармоничное развитие
  const levels = statKeys.map((k) => stats[k].level);
  const maxL = Math.max(...levels);
  const minL = Math.min(...levels);
  const isBalanced = maxL > 0 && (maxL - minL) / maxL <= 0.3;
  const balanceMultiplier = isBalanced ? 1.15 : 1.0;

  return Math.max(1, Math.floor(avg * balanceMultiplier));
}

export function getRank(charLevel: number): Rank {
  if (charLevel >= 50) return 'S';
  if (charLevel >= 30) return 'A';
  if (charLevel >= 20) return 'B';
  if (charLevel >= 12) return 'C';
  if (charLevel >= 6) return 'D';
  return 'E';
}

export function getRankTitle(rank: Rank): string {
  const titles: Record<Rank, string> = {
    E: 'Новичок',
    D: 'Пробуждение',
    C: 'Охотник',
    B: 'Элита',
    A: 'Мастер',
    S: 'Легенда',
  };
  return titles[rank];
}

// ─── Базовый XP за действие ───────────────────────────────────────────────────

// Базовые XP за 1 минуту по каждому стату
const BASE_XP_PER_MINUTE: Record<StatKey, number> = {
  str: 0.45,
  int: 0.38,
  cha: 0.30,
  soc: 0.55, // Сложнее прокачивать — выше ценность
  biz: 0.35,
  vit: 0.28,
  wil: 0.42,
  sty: 0.32, // Стиль — одежда, внешний вид, грумминг
  kar: 0.25, // Карма — добрые дела, помощь людям
};

// Минимальный и максимальный XP за одно действие
const MIN_XP = 5;
const MAX_XP = 500;

export function calculateBaseXP(stat: StatKey, durationMinutes: number): number {
  const raw = BASE_XP_PER_MINUTE[stat] * durationMinutes;
  return Math.min(MAX_XP, Math.max(MIN_XP, Math.round(raw)));
}

// ─── Мультипликаторы ──────────────────────────────────────────────────────────

export function difficultyMultiplier(difficulty: Difficulty): number {
  const map: Record<Difficulty, number> = {
    easy: 0.75,
    normal: 1.0,
    hard: 1.5,
  };
  return map[difficulty];
}

export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 60) return 2.5;
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.25;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

export function comboMultiplier(statsHitToday: StatKey[]): number {
  const unique = new Set(statsHitToday).size;
  if (unique >= 9) return 1.5;
  if (unique >= 6) return 1.25;
  if (unique >= 3) return 1.1;
  return 1.0;
}

// Убывающая отдача на высоких уровнях — нужны более сложные действия
export function diminishingMultiplier(statLevel: number): number {
  if (statLevel <= 10) return 1.0;
  if (statLevel <= 20) return 0.85;
  if (statLevel <= 30) return 0.70;
  if (statLevel <= 50) return 0.55;
  return 0.40;
}

// ─── Итоговый XP ─────────────────────────────────────────────────────────────

export interface XPCalculation {
  baseXP: number;
  finalXP: number;
  multipliers: {
    streak: number;
    difficulty: number;
    combo: number;
    diminishing: number;
  };
}

export function calculateFinalXP(
  stat: StatKey,
  durationMinutes: number,
  difficulty: Difficulty,
  streakDays: number,
  statsHitToday: StatKey[],
  statLevel: number
): XPCalculation {
  const baseXP = calculateBaseXP(stat, durationMinutes);
  const mStreak = streakMultiplier(streakDays);
  const mDiff = difficultyMultiplier(difficulty);
  const mCombo = comboMultiplier([...statsHitToday, stat]);
  const mDiminish = diminishingMultiplier(statLevel);

  const finalXP = Math.round(baseXP * mStreak * mDiff * mCombo * mDiminish);

  return {
    baseXP,
    finalXP: Math.max(1, finalXP),
    multipliers: {
      streak: mStreak,
      difficulty: mDiff,
      combo: mCombo,
      diminishing: mDiminish,
    },
  };
}

// ─── Деградация ───────────────────────────────────────────────────────────────

// Дней без активности до штрафа
const DECAY_THRESHOLD_DAYS: Record<StatKey, number> = {
  str: 7,
  int: 14,
  cha: 5,
  soc: 7,
  biz: 10,
  vit: 3,
  wil: 4,
  sty: 21, // Стиль деградирует медленно
  kar: 10, // Карма — нужно делать добро регулярно
};

// Штраф уровней за каждый порог
const DECAY_PENALTY: Record<StatKey, number> = {
  str: 1,
  int: 1,
  cha: 1,
  soc: 2,
  biz: 1,
  vit: 1,
  wil: 1,
  sty: 1,
  kar: 1,
};

export function calculateDecay(stat: Stat): number {
  if (!stat.lastActivityAt) return 0;
  const daysSince = (Date.now() - stat.lastActivityAt) / (1000 * 60 * 60 * 24);
  const threshold = DECAY_THRESHOLD_DAYS[stat.key];
  if (daysSince < threshold) return 0;

  const periods = Math.floor(daysSince / threshold);
  const penalty = periods * DECAY_PENALTY[stat.key];
  return Math.min(penalty, stat.level - 1); // Нельзя упасть ниже 1
}

export function getDaysWithoutActivity(stat: Stat): number {
  if (!stat.lastActivityAt) return 0;
  return Math.floor((Date.now() - stat.lastActivityAt) / (1000 * 60 * 60 * 24));
}

export function isStatAtRisk(stat: Stat): boolean {
  const days = getDaysWithoutActivity(stat);
  return days >= DECAY_THRESHOLD_DAYS[stat.key] - 1; // Предупреждение за 1 день
}

// ─── Стрик ────────────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function updateStreak(lastLogDate: string | null, currentStreak: number): number {
  const today = todayStr();
  if (!lastLogDate) return 1;

  const last = new Date(lastLogDate);
  const now = new Date(today);
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return currentStreak; // Тот же день
  if (diffDays === 1) return currentStreak + 1; // Следующий день — продолжаем
  return 1; // Пропуск — сброс
}
