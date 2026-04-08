export type StatKey = 'str' | 'int' | 'cha' | 'soc' | 'biz' | 'vit' | 'wil' | 'sty' | 'kar';

export const ALL_STAT_KEYS: StatKey[] = ['str', 'int', 'cha', 'soc', 'biz', 'vit', 'wil', 'sty', 'kar'];

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface Stat {
  key: StatKey;
  level: number;
  currentXP: number;
  totalXP: number;
  lastActivityAt: number | null; // timestamp
}

export interface ActionLog {
  id: string;
  description: string;
  stat: StatKey;
  difficulty: Difficulty;
  durationMinutes: number;
  baseXP: number;
  finalXP: number;
  multipliers: {
    streak: number;
    difficulty: number;
    combo: number;
    diminishing: number;
  };
  createdAt: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  statsHit: StatKey[];
  totalXP: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  stat: StatKey | 'all';
  condition: { type: 'level' | 'total_xp' | 'streak' | 'actions_count'; value: number };
  unlockedAt: number | null;
  bonusXP: number;
}

export interface Character {
  name: string;
  stats: Record<StatKey, Stat>;
  streakDays: number;
  lastLogDate: string | null; // YYYY-MM-DD
  createdAt: number;
}

export interface LevelUpEvent {
  stat: StatKey;
  oldLevel: number;
  newLevel: number;
  xpGained: number;
}

// ─── Титулы ───────────────────────────────────────────────────────────────────

export type TitleCondition =
  | { type: 'stat_level'; stat: StatKey; level: number }
  | { type: 'streak'; days: number }
  | { type: 'char_level'; level: number }
  | { type: 'rank'; rank: Rank }
  | { type: 'total_xp'; xp: number };

export interface Title {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: TitleCondition;
  rare: boolean;
}

// ─── Дневник ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  question: string;
  answer: string;
  createdAt: number;
}

// ─── Еженедельный отчёт ───────────────────────────────────────────────────────

export interface WeeklyReport {
  id: string;
  weekStart: string; // YYYY-MM-DD Monday
  generatedAt: number;
  summary: string;
  highlights: string[];
  suggestions: string[];
  topStat: StatKey | null;
  weakStat: StatKey | null;
  totalXP: number;
}

// ─── Сезон ────────────────────────────────────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  emoji: string;
  bonusStat: StatKey;
  multiplier: number; // e.g. 1.3 = +30%
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
}

// ─── Дерево навыков ───────────────────────────────────────────────────────────

export interface SkillNode {
  id: string;
  stat: StatKey;
  name: string;
  description: string;
  emoji: string;
  unlockLevel: number;
  passiveBonus: number; // 0.1 = +10% XP to this stat
  dependencies: string[];
}

// ─── Задания из дневника ──────────────────────────────────────────────────────

export interface JournalTask {
  id: string;
  title: string;
  description: string;
  stat: StatKey;
  sourceEntryId: string; // ID записи в дневнике, из которой создано
  createdAt: number;
  completed: boolean;
  completedAt: number | null;
}

// ─── Книги ────────────────────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string; // "Бизнес", "Психология", "Финансы", "Здоровье", "Харизма", "Философия" и т.д.
  relatedStat: StatKey;
  totalPages: number;
  currentPage: number;
  status: 'want' | 'reading' | 'completed';
  addedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  practices: BookPractice[];
  notes: string;
}

export interface BookPractice {
  id: string;
  description: string;
  completed: boolean;
  completedAt: number | null;
}
