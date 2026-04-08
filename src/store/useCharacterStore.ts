import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Character,
  StatKey,
  Difficulty,
  ActionLog,
  DailyStats,
  LevelUpEvent,
  Stat,
} from '../engine/types';
import {
  calculateFinalXP,
  levelFromTotalXP,
  updateStreak,
  calculateDecay,
  todayStr,
} from '../engine/xp';
import { getSeasonMultiplier } from '../engine/seasons';
import { getSkillPassiveBonus } from '../engine/skillTree';

const ALL_STATS: StatKey[] = ['str', 'int', 'cha', 'soc', 'biz', 'vit', 'wil', 'sty', 'kar'];

function createDefaultStat(key: StatKey): Stat {
  return {
    key,
    level: 1,
    currentXP: 0,
    totalXP: 0,
    lastActivityAt: null,
  };
}

function createDefaultCharacter(): Character {
  return {
    name: 'Охотник',
    stats: Object.fromEntries(ALL_STATS.map((k) => [k, createDefaultStat(k)])) as Record<StatKey, Stat>,
    streakDays: 0,
    lastLogDate: null,
    createdAt: Date.now(),
  };
}

interface CharacterStore {
  character: Character;
  actionLogs: ActionLog[];
  dailyStats: DailyStats[];
  completedQuestIds: string[];
  pendingLevelUp: LevelUpEvent | null;

  // Actions
  logAction: (params: {
    description: string;
    stat: StatKey;
    difficulty: Difficulty;
    durationMinutes: number;
    unlockedSkillIds?: string[];
  }) => LevelUpEvent | null;

  completeQuest: (questId: string, stat: StatKey, xpBonus: number) => void;
  applyQuestPenalty: (totalXP: number) => void;
  clearLevelUp: () => void;
  setName: (name: string) => void;
  applyDecay: () => void;
  getTodayStats: () => DailyStats | null;
  getWeeklyXP: () => { date: string; xp: number }[];
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set, get) => ({
      character: createDefaultCharacter(),
      actionLogs: [],
      dailyStats: [],
      completedQuestIds: [],
      pendingLevelUp: null,

      logAction: ({ description, stat, difficulty, durationMinutes, unlockedSkillIds = [] }) => {
        const { character, actionLogs, dailyStats } = get();
        const today = todayStr();

        // Стрик
        const newStreak = updateStreak(character.lastLogDate, character.streakDays);

        // Статы прокачанные сегодня
        const todayLog = dailyStats.find((d) => d.date === today);
        const statsHitToday = todayLog?.statsHit ?? [];

        // Расчёт XP
        const rawCalc = calculateFinalXP(
          stat,
          durationMinutes,
          difficulty,
          newStreak,
          statsHitToday,
          character.stats[stat].level
        );

        // Бонус сезона и дерева навыков
        const seasonMult = getSeasonMultiplier(stat);
        const skillMult = 1.0 + getSkillPassiveBonus(stat, unlockedSkillIds);
        const { baseXP, multipliers } = rawCalc;
        const finalXP = Math.max(1, Math.round(rawCalc.finalXP * seasonMult * skillMult));

        // Обновляем стат
        const currentStat = character.stats[stat];
        const newTotalXP = currentStat.totalXP + finalXP;
        const { level: newLevel, currentXP, neededXP } = levelFromTotalXP(newTotalXP);

        const levelUpEvent: LevelUpEvent | null =
          newLevel > currentStat.level
            ? { stat, oldLevel: currentStat.level, newLevel, xpGained: finalXP }
            : null;

        const updatedStat: Stat = {
          ...currentStat,
          level: newLevel,
          currentXP,
          totalXP: newTotalXP,
          lastActivityAt: Date.now(),
        };

        // Лог действия
        const logEntry: ActionLog = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          description,
          stat,
          difficulty,
          durationMinutes,
          baseXP,
          finalXP,
          multipliers,
          createdAt: Date.now(),
        };

        // Daily stats
        const updatedDailyStats = [...dailyStats];
        const todayIndex = updatedDailyStats.findIndex((d) => d.date === today);
        if (todayIndex >= 0) {
          const existing = updatedDailyStats[todayIndex];
          updatedDailyStats[todayIndex] = {
            ...existing,
            statsHit: Array.from(new Set([...existing.statsHit, stat])),
            totalXP: existing.totalXP + finalXP,
          };
        } else {
          updatedDailyStats.push({ date: today, statsHit: [stat], totalXP: finalXP });
        }

        set({
          character: {
            ...character,
            stats: { ...character.stats, [stat]: updatedStat },
            streakDays: newStreak,
            lastLogDate: today,
          },
          actionLogs: [logEntry, ...actionLogs].slice(0, 500), // Хранить последние 500
          dailyStats: updatedDailyStats.slice(-90), // Хранить 90 дней
          pendingLevelUp: levelUpEvent,
        });

        return levelUpEvent;
      },

      completeQuest: (questId, stat, xpBonus) => {
        const { character, completedQuestIds } = get();
        if (completedQuestIds.includes(questId)) return;

        const currentStat = character.stats[stat];
        const newTotalXP = currentStat.totalXP + xpBonus;
        const { level: newLevel, currentXP } = levelFromTotalXP(newTotalXP);

        set({
          completedQuestIds: [...completedQuestIds, questId],
          character: {
            ...character,
            stats: {
              ...character.stats,
              [stat]: { ...currentStat, level: newLevel, currentXP, totalXP: newTotalXP },
            },
          },
        });
      },

      applyQuestPenalty: (totalXP) => {
        const { character } = get();
        // Штраф размазывается по всем статам равномерно
        const penaltyPerStat = Math.ceil(totalXP / ALL_STATS.length);
        const updatedStats = { ...character.stats };
        ALL_STATS.forEach((key) => {
          const stat = character.stats[key];
          const newTotalXP = Math.max(0, stat.totalXP - penaltyPerStat);
          const { level, currentXP } = levelFromTotalXP(newTotalXP);
          updatedStats[key] = { ...stat, level: Math.max(1, level), currentXP, totalXP: newTotalXP };
        });
        set({ character: { ...character, stats: updatedStats } });
      },

      clearLevelUp: () => set({ pendingLevelUp: null }),

      setName: (name) =>
        set((state) => ({ character: { ...state.character, name } })),

      applyDecay: () => {
        const { character } = get();
        const updatedStats = { ...character.stats };
        let changed = false;

        ALL_STATS.forEach((key) => {
          const penalty = calculateDecay(character.stats[key]);
          if (penalty > 0) {
            const stat = character.stats[key];
            const newLevel = Math.max(1, stat.level - penalty);
            const { currentXP, neededXP } = levelFromTotalXP(
              Math.max(0, stat.totalXP - penalty * 500)
            );
            updatedStats[key] = { ...stat, level: newLevel, currentXP, totalXP: Math.max(0, stat.totalXP - penalty * 500) };
            changed = true;
          }
        });

        if (changed) {
          set({ character: { ...character, stats: updatedStats } });
        }
      },

      getTodayStats: () => {
        const today = todayStr();
        return get().dailyStats.find((d) => d.date === today) ?? null;
      },

      getWeeklyXP: () => {
        const { dailyStats } = get();
        const result: { date: string; xp: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const found = dailyStats.find((s) => s.date === dateStr);
          result.push({ date: dateStr, xp: found?.totalXP ?? 0 });
        }
        return result;
      },
    }),
    {
      name: 'solo-leveling-character',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
