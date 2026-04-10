import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatKey } from '../engine/types';
import { todayStr } from '../engine/xp';

export interface SphereContext {
  stat: StatKey;
  situation: string;
  goal: string;
  blocker: string;
  updatedAt: number;
}

export interface CoachInsight {
  text: string;
  role: string;
  stat: StatKey;
  generatedAt: number;
}

const STAT_FULL: Record<StatKey, string> = {
  str: 'Сила',
  int: 'Интеллект',
  cha: 'Харизма',
  soc: 'Социальная жизнь',
  biz: 'Бизнес',
  vit: 'Здоровье',
  wil: 'Воля',
  sty: 'Стиль',
  kar: 'Карма',
};

// Порядок онбординга — от самых важных к менее
const ONBOARDING_ORDER: StatKey[] = ['biz', 'str', 'vit', 'int', 'soc', 'cha', 'wil', 'sty', 'kar'];

const ONBOARDING_QUESTIONS: Record<StatKey, string> = {
  biz: 'Расскажи о своём деле, работе или проектах. Над чем сейчас работаешь и куда движешься?',
  str: 'Как дела с физической активностью? Тренируешься, занимаешься спортом или есть цели в этом направлении?',
  vit: 'Как обстоят дела со здоровьем, питанием и сном? Есть ли цели или проблемы которые хочешь решить?',
  int: 'Что сейчас читаешь или изучаешь? Есть ли курсы, навыки или направления для роста?',
  soc: 'Как твоя личная жизнь и отношения? Есть ли цели или что хочешь изменить?',
  cha: 'Как с публичностью и общением? Выступаешь, ведёшь соцсети, развиваешь нетворкинг?',
  wil: 'Что сейчас самое сложное психологически? Над какой дисциплиной или привычкой работаешь?',
  sty: 'Как со стилем и внешним видом? Есть ли цели или что хочешь изменить в образе?',
  kar: 'Помогаешь ли кому-то сейчас? Есть ли благотворительность, менторство или волонтёрство?',
};

interface LifeProfileStore {
  sphereContexts: Partial<Record<StatKey, SphereContext>>;
  coachInsight: CoachInsight | null;
  lastContextDate: string | null;
  lastInsightViewDate: string | null;

  setSphereContexts: (contexts: Partial<Record<StatKey, SphereContext>>) => void;
  setCoachInsight: (insight: CoachInsight) => void;
  markContextDoneToday: () => void;
  markInsightViewed: () => void;
  resetInsightViewDate: () => void;
  shouldShowContextBlocker: () => boolean;
  shouldShowInsightBlocker: () => boolean;
  getContextQuestion: () => string;
  buildLifeSummaryForAI: () => string;
}

export const useLifeProfileStore = create<LifeProfileStore>()(
  persist(
    (set, get) => ({
      sphereContexts: {},
      coachInsight: null,
      lastContextDate: null,
      lastInsightViewDate: null,

      setSphereContexts: (contexts) =>
        set((state) => ({
          sphereContexts: { ...state.sphereContexts, ...contexts },
        })),

      setCoachInsight: (insight) => set({ coachInsight: insight }),

      markContextDoneToday: () => set({ lastContextDate: todayStr() }),

      markInsightViewed: () => set({ lastInsightViewDate: todayStr() }),

      resetInsightViewDate: () => set({ lastInsightViewDate: null }),

      shouldShowContextBlocker: () => {
        const hour = new Date().getHours();
        if (hour < 18) return false;
        return get().lastContextDate !== todayStr();
      },

      shouldShowInsightBlocker: () => {
        const hour = new Date().getHours();
        // Показываем принудительно после 21:00 если совет есть и ещё не просмотрен сегодня
        if (hour < 21) return false;
        const { coachInsight, lastInsightViewDate } = get();
        if (!coachInsight) return false;
        return lastInsightViewDate !== todayStr();
      },

      getContextQuestion: () => {
        const { sphereContexts } = get();

        // Онбординг: находим первую сферу без контекста
        const missing = ONBOARDING_ORDER.find((stat) => !sphereContexts[stat]);
        if (missing) return ONBOARDING_QUESTIONS[missing];

        // Все сферы заполнены — задаём вопрос о прогрессе
        const today = todayStr();
        const dayHash = today.split('-').reduce((a, b) => a + parseInt(b), 0);
        const keys = ONBOARDING_ORDER.filter((k) => sphereContexts[k]);
        const stat = keys[dayHash % keys.length];
        const ctx = sphereContexts[stat]!;

        const templates = [
          `Что сегодня продвинулось в направлении "${ctx.goal}"? Что конкретно сделал?`,
          `"${ctx.goal}" — что сейчас главное препятствие и как планируешь его преодолеть?`,
          `Оцени свой день в сфере ${STAT_FULL[stat]}. Что получилось, что нет?`,
          `Что нового попробовал или узнал сегодня для достижения "${ctx.goal}"?`,
          `Как прошёл день по ${STAT_FULL[stat]}? Есть что скорректировать в подходе?`,
        ];

        return templates[dayHash % templates.length];
      },

      buildLifeSummaryForAI: () => {
        const { sphereContexts } = get();
        const contexts = Object.values(sphereContexts).filter(Boolean) as SphereContext[];
        if (contexts.length === 0) return '';

        const lines = ['РЕАЛЬНЫЙ ЖИЗНЕННЫЙ КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:'];
        for (const ctx of contexts) {
          let line = `- ${STAT_FULL[ctx.stat]}: ${ctx.situation}. Цель: ${ctx.goal}`;
          if (ctx.blocker) line += `. Препятствие: ${ctx.blocker}`;
          lines.push(line);
        }
        lines.push('\nКвесты и советы должны быть максимально релевантны РЕАЛЬНОЙ жизни — не абстрактными.');
        return lines.join('\n');
      },
    }),
    {
      name: 'solo-leveling-life-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
