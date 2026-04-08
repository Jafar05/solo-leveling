import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeneratedQuest, generateQuests } from '../engine/questAI';
import { StatKey, Stat } from '../engine/types';
import { todayStr } from '../engine/xp';
import { BehavioralProfile } from '../engine/adaptiveEngine';

export type QuestType = 'daily' | 'story' | 'boss';

export interface CompletedQuestRecord {
  id: string; // уникальный id записи
  questId: string;
  title: string;
  emoji: string;
  stat: StatKey;
  xpReward: number;
  questType: QuestType;
  startedAt: number | null; // null если запущен без таймера
  completedAt: number;
  durationSeconds: number | null;
}

interface CompletedQuestMeta {
  title: string;
  emoji: string;
  stat: StatKey;
  xpReward: number;
  questType: QuestType;
}

export interface PunishmentTask {
  id: string;
  date: string;
  missedCount: number;
  emoji: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface DailyPenalty {
  date: string;
  missedCount: number;
  applied: boolean;
  punishmentTask: PunishmentTask;
}

interface QuestStore {
  // Ежедневные — хранятся с датой, не затираются при обновлении
  dailyQuests: GeneratedQuest[];
  dailyQuestsDate: string | null; // На какой день текущий набор
  lastDailyRefresh: string | null; // Последний раз когда обновляли внутри дня

  storyQuests: GeneratedQuest[];
  bossQuests: GeneratedQuest[];

  completedIds: string[]; // Все выполненные за всё время
  penalties: DailyPenalty[]; // История штрафов

  // Таймеры активных квестов: questId → timestamp запуска
  activeQuestTimers: Record<string, number>;
  // Идентификаторы запланированных уведомлений: questId → [notifId, ...]
  questNotificationIds: Record<string, string[]>;
  // История выполненных квестов
  questHistory: CompletedQuestRecord[];

  isGenerating: boolean;
  generateError: string;

  // Actions
  checkAndApplyDayRollover: (
    stats: Record<StatKey, Stat>,
    apiKey: string,
    profile?: BehavioralProfile
  ) => Promise<void>;
  refreshUncompletedQuests: (stats: Record<StatKey, Stat>, apiKey: string, profile?: BehavioralProfile) => Promise<void>;
  generateStoryQuests: (stats: Record<StatKey, Stat>, apiKey: string, profile?: BehavioralProfile) => Promise<void>;
  generateBossQuests: (stats: Record<StatKey, Stat>, apiKey: string, profile?: BehavioralProfile) => Promise<void>;
  startQuest: (questId: string) => void;
  setQuestNotificationIds: (questId: string, ids: string[]) => void;
  completeQuest: (id: string, meta?: CompletedQuestMeta) => void;
  completePunishment: (date: string) => void;
  isQuestCompleted: (id: string) => boolean;
  isQuestStarted: (id: string) => boolean;
  getQuestStartedAt: (id: string) => number | null;
  getTodayPenalty: () => DailyPenalty | null;
  getActivePunishments: () => PunishmentTask[];
  getHistoryByType: (type: QuestType) => CompletedQuestRecord[];
}

const PUNISHMENT_POOL: Array<{ emoji: string; title: string; description: (n: number) => string }> = [
  // ── Физические ───────────────────────────────────────────────────────────────
  { emoji: '💪', title: 'Отжимания', description: (n) => `Сделай ${n * 15} отжиманий прямо сейчас. Без отдыха — это расплата за лень.` },
  { emoji: '🏋️', title: 'Приседания', description: (n) => `${n * 20} приседаний. Тело должно помнить цену невыполненных обязательств.` },
  { emoji: '🏃', title: 'Пробежка', description: (n) => `Пробеги ${n} км или сделай ${n * 10} минут интенсивной ходьбы.` },
  { emoji: '🎯', title: 'Планка', description: (n) => `Держи планку ${n * 60} секунд суммарно. Можно делить на подходы.` },
  { emoji: '🚿', title: 'Холодный душ', description: () => `Прими холодный душ — минимум 2 минуты. Терпи и думай о дисциплине.` },
  { emoji: '🚴', title: 'Кардио', description: (n) => `${n * 15} минут велосипеда, скакалки или эллипса — без остановок.` },
  { emoji: '🤸', title: 'Растяжка', description: (n) => `${n * 10} минут полного стретчинга. Медленно, глубоко, осознанно.` },

  // ── Коммуникация ─────────────────────────────────────────────────────────────
  { emoji: '🗣️', title: 'Знакомство', description: (n) => `Познакомься с ${n} незнакомым(и) человеком(и) сегодня. Первым начинай разговор ты.` },
  { emoji: '📞', title: 'Звонок', description: () => `Позвони человеку, которому давно не звонил. Не пиши — именно голосовой звонок.` },
  { emoji: '💬', title: 'Честный разговор', description: () => `Поговори с кем-то о своих целях и объясни, почему не справился с заданиями. Вслух.` },
  { emoji: '🎤', title: 'Публичная речь', description: (n) => `Выступи перед любой аудиторией (хоть ${n} человека) — расскажи что-то полезное 3+ минуты.` },
  { emoji: '💌', title: 'Письмо благодарности', description: () => `Напиши развёрнутое письмо или сообщение кому-то, кто сделал твою жизнь лучше. Искренне.` },
  { emoji: '🤝', title: 'Нетворкинг', description: () => `Напиши первым одному человеку, с которым хочешь наладить профессиональный контакт.` },
  { emoji: '🙋', title: 'Первый шаг', description: (n) => `Подойди к ${n} незнакомому(ым) человеку(ям) и начни разговор на любую тему. Страх — не причина.` },

  // ── Интеллектуальные ─────────────────────────────────────────────────────────
  { emoji: '📖', title: 'Чтение', description: (n) => `Прочитай ${n * 5} страниц книги по саморазвитию или своей специальности.` },
  { emoji: '📰', title: 'Статья + конспект', description: (n) => `Найди и прочитай ${n} статью(и) по теме своих целей. Запиши главную мысль каждой.` },
  { emoji: '🧩', title: 'Разбор ошибок', description: (n) => `Письменно разбери ${n} свою(и) ошибку(и) за эту неделю: что пошло не так и конкретный план исправления.` },
  { emoji: '🎓', title: 'Обучение', description: (n) => `Пройди ${n * 2} урока онлайн-курса или посмотри образовательный контент на ${n * 20} минут с записью тезисов.` },
  { emoji: '🧠', title: 'Мозговой штурм', description: () => `Напиши 10 идей для улучшения одной сферы своей жизни. Без фильтров — любые, даже дикие.` },

  // ── Творческие ───────────────────────────────────────────────────────────────
  { emoji: '✏️', title: 'Свободное письмо', description: () => `Напиши 1 страницу текста без цензуры — мысли, злость, мечты, страхи. Всё что внутри.` },
  { emoji: '🎨', title: 'Визуализация цели', description: () => `Опиши письменно свою жизнь через 3 года в деталях: где живёшь, чем занимаешься, кто рядом.` },
  { emoji: '📸', title: 'Документация дня', description: () => `Сфотографируй 5 моментов сегодняшнего дня и напиши к каждому — что они значат для тебя.` },

  // ── Дисциплина и среда ───────────────────────────────────────────────────────
  { emoji: '🧹', title: 'Уборка пространства', description: (n) => `Убери ${n} зоны вокруг себя до состояния идеального порядка. Хаос снаружи = хаос внутри.` },
  { emoji: '📵', title: 'Цифровой детокс', description: (n) => `Убери телефон на ${n} час(а). Без соцсетей, видео и мессенджеров — только реальная жизнь.` },
  { emoji: '🛏️', title: 'Режим сна', description: () => `Ляг спать до 23:00 и завтра встань на 1 час раньше обычного. Режим — основа всего.` },
  { emoji: '🍎', title: 'Чистое питание', description: () => `Весь день питайся только чистой едой: никакого сахара, фастфуда, алкоголя. Полный день.` },
  { emoji: '☀️', title: 'Утренний ритуал', description: () => `Завтра утром: подъём без телефона, стакан воды, 5 минут тишины, план на день — всё до 8:00.` },

  // ── Финансовые ───────────────────────────────────────────────────────────────
  { emoji: '💰', title: 'Финансовый аудит', description: () => `Просмотри все траты за последнюю неделю. Найди 3 лишних расхода и реши как от них избавиться.` },
  { emoji: '📊', title: 'Бюджет дня', description: () => `Составь детальный бюджет на следующие 7 дней. Каждая статья расходов — с конкретной суммой.` },
  { emoji: '📈', title: 'Инвестиция в себя', description: () => `Найди и запишись на курс, книгу или мастер-класс по своей профессии. Деньги должны работать.` },

  // ── Природа и восстановление ─────────────────────────────────────────────────
  { emoji: '🌳', title: 'Прогулка в тишине', description: (n) => `Иди гулять ${n * 20} минут без телефона, наушников и музыки. Только ты и мысли.` },
  { emoji: '🧘', title: 'Медитация', description: (n) => `Медитируй ${n * 5} минут в полной тишине. Сядь удобно и просто наблюдай за дыханием.` },
  { emoji: '🌅', title: 'Встреча рассвета', description: () => `Завтра встань до рассвета и проведи первый час в тишине и намерении. Ни соцсетей, ни новостей.` },

  // ── Смелость и выход из зоны комфорта ───────────────────────────────────────
  { emoji: '😨', title: 'Сделай то, чего боишься', description: () => `Напиши одно действие, которое давно откладываешь из страха. Сделай его сегодня. Без отмазок.` },
  { emoji: '🎲', title: 'Случайное приключение', description: () => `Иди туда, где ещё не был. Поговори с незнакомцем. Попробуй еду которую никогда не ел. Спонтанно.` },
  { emoji: '🙏', title: 'Попроси о помощи', description: () => `Попроси кого-то о помощи в деле, которое давно откладываешь. Самодостаточность — не одиночество.` },
];

function generatePunishment(date: string, missedCount: number): PunishmentTask {
  // Детерминированный выбор на основе даты
  const dayHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  const pool = PUNISHMENT_POOL[dayHash % PUNISHMENT_POOL.length];
  return {
    id: `punishment-${date}`,
    date,
    missedCount,
    emoji: pool.emoji,
    title: pool.title,
    description: pool.description(missedCount),
    completed: false,
  };
}

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      dailyQuests: [],
      dailyQuestsDate: null,
      lastDailyRefresh: null,
      storyQuests: [],
      bossQuests: [],
      completedIds: [],
      penalties: [],
      activeQuestTimers: {},
      questNotificationIds: {},
      questHistory: [],
      isGenerating: false,
      generateError: '',

      // Вызывается при каждом открытии приложения
      checkAndApplyDayRollover: async (stats, apiKey, profile) => {
        const { dailyQuestsDate, dailyQuests, completedIds, penalties } = get();
        const today = todayStr();

        // Новый день — назначаем задание-наказание за вчера и генерим новые квесты
        if (dailyQuestsDate && dailyQuestsDate !== today) {
          const yesterday = dailyQuestsDate;
          const alreadyPenalized = penalties.some((p) => p.date === yesterday && p.applied);

          if (!alreadyPenalized) {
            const yesterdayQuests = dailyQuests.filter((q) => q.generatedAt > 0); // все вчерашние
            const missedCount = yesterdayQuests.filter((q) => !completedIds.includes(q.id)).length;

            if (missedCount > 0) {
              const punishmentTask = generatePunishment(yesterday, missedCount);
              const penalty: DailyPenalty = {
                date: yesterday,
                missedCount,
                applied: true,
                punishmentTask,
              };
              set((state) => ({ penalties: [...state.penalties.slice(-30), penalty] }));
            }
          }

          // Генерим новые квесты на новый день (старые выполненные не трогаем — они в completedIds)
          if (apiKey) {
            await get().refreshUncompletedQuests(stats, apiKey, profile);
          }
        } else if (!dailyQuestsDate && apiKey) {
          // Первый запуск
          await get().refreshUncompletedQuests(stats, apiKey, profile);
        }
      },

      // Обновить только невыполненные квесты
      refreshUncompletedQuests: async (stats, apiKey, profile) => {
        const { dailyQuests, completedIds } = get();
        const today = todayStr();
        set({ isGenerating: true, generateError: '' });

        try {
          // Выполненные сегодняшние квесты — оставляем
          const completedToday = dailyQuests.filter(
            (q) => completedIds.includes(q.id) && q.generatedAt >= startOfDay()
          );

          // Статы уже закрытые выполненными квестами
          const coveredStats = new Set(completedToday.map((q) => q.stat));

          // Сколько новых нужно (всего 7 - уже выполнено)
          const needed = Math.max(1, 7 - completedToday.length);

          // Генерируем новые квесты с учётом адаптивного профиля
          const newQuests = await generateQuests('daily', needed, stats, apiKey, Array.from(coveredStats), profile);

          // Итоговый список: выполненные + новые
          set({
            dailyQuests: [...completedToday, ...newQuests],
            dailyQuestsDate: today,
            lastDailyRefresh: today,
          });
        } catch (e: any) {
          set({ generateError: e?.message ?? 'Ошибка генерации' });
        } finally {
          set({ isGenerating: false });
        }
      },

      generateStoryQuests: async (stats, apiKey, profile) => {
        set({ isGenerating: true, generateError: '' });
        try {
          const quests = await generateQuests('story', 5, stats, apiKey, [], profile);
          set((state) => ({ storyQuests: [...state.storyQuests, ...quests] }));
        } catch (e: any) {
          set({ generateError: e?.message ?? 'Ошибка генерации' });
        } finally {
          set({ isGenerating: false });
        }
      },

      generateBossQuests: async (stats, apiKey, profile) => {
        set({ isGenerating: true, generateError: '' });
        try {
          const quests = await generateQuests('boss', 3, stats, apiKey, [], profile);
          set((state) => ({ bossQuests: [...state.bossQuests, ...quests] }));
        } catch (e: any) {
          set({ generateError: e?.message ?? 'Ошибка генерации' });
        } finally {
          set({ isGenerating: false });
        }
      },

      startQuest: (questId) =>
        set((state) => ({
          activeQuestTimers: { ...state.activeQuestTimers, [questId]: Date.now() },
        })),

      setQuestNotificationIds: (questId, ids) =>
        set((state) => ({
          questNotificationIds: { ...state.questNotificationIds, [questId]: ids },
        })),

      completeQuest: (id, meta) =>
        set((state) => {
          const startedAt = state.activeQuestTimers[id] ?? null;
          const completedAt = Date.now();
          const durationSeconds = startedAt ? Math.floor((completedAt - startedAt) / 1000) : null;

          // Очищаем таймер и уведомления для этого квеста
          const activeQuestTimers = { ...state.activeQuestTimers };
          delete activeQuestTimers[id];
          const questNotificationIds = { ...state.questNotificationIds };
          delete questNotificationIds[id];

          const historyRecord: CompletedQuestRecord | null = meta
            ? {
                id: `${id}-${completedAt}`,
                questId: id,
                title: meta.title,
                emoji: meta.emoji,
                stat: meta.stat,
                xpReward: meta.xpReward,
                questType: meta.questType,
                startedAt,
                completedAt,
                durationSeconds,
              }
            : null;

          return {
            completedIds: [...state.completedIds, id],
            activeQuestTimers,
            questNotificationIds,
            questHistory: historyRecord
              ? [...state.questHistory, historyRecord]
              : state.questHistory,
          };
        }),

      completePunishment: (date) =>
        set((state) => ({
          penalties: state.penalties.map((p) =>
            p.date === date
              ? { ...p, punishmentTask: { ...p.punishmentTask, completed: true } }
              : p
          ),
        })),

      isQuestCompleted: (id) => get().completedIds.includes(id),
      isQuestStarted: (id) => id in get().activeQuestTimers,
      getQuestStartedAt: (id) => get().activeQuestTimers[id] ?? null,

      getTodayPenalty: () => {
        // Возвращает первое невыполненное наказание
        return get().penalties.find((p) => p.applied && !p.punishmentTask.completed) ?? null;
      },

      getActivePunishments: () => {
        return get().penalties
          .filter((p) => p.applied && !p.punishmentTask.completed)
          .map((p) => p.punishmentTask);
      },

      getHistoryByType: (type) =>
        get().questHistory.filter((r) => r.questType === type).reverse(),
    }),
    {
      name: 'solo-leveling-quests',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

function startOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
