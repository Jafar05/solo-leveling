import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayStr } from '../engine/xp';

export interface JournalEntry {
  date: string;
  question: string;
  answer: string;
  answeredAt: number | null;
}

interface JournalStore {
  entries: JournalEntry[];
  // Actions
  ensureTodayQuestion: () => void;
  answerTodayQuestion: (answer: string) => void;
  getTodayEntry: () => JournalEntry | null;
  isTodayAnswered: () => boolean;
  shouldShowBlocker: () => boolean;
}

const QUESTIONS = [
  'Что сегодня было самым сложным и как ты с этим справился?',
  'Чем ты гордишься сегодня?',
  'Что помешало тебе выполнить все задания? Как избежать этого завтра?',
  'Какой урок ты усвоил сегодня?',
  'Что завтра сделаешь иначе?',
  'Оцени свой день от 1 до 10 и объясни почему именно столько.',
  'Что зарядило тебя энергией сегодня?',
  'Что осталось несделанным? По какой причине?',
  'Какой момент сегодня ты хотел бы прожить заново и почему?',
  'Что тебя отвлекало сегодня и как от этого защититься?',
  'Как ты заботился о своём теле и разуме сегодня?',
  'Сделал ли ты сегодня что-то, что приближает тебя к главной цели?',
  'Что бы ты посоветовал себе утреннему на основе сегодняшнего дня?',
  'Как прошли твои отношения с людьми сегодня?',
  'Назови три вещи, за которые ты благодарен сегодня.',
];

function getQuestionForDate(date: string): string {
  const dayHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  return QUESTIONS[dayHash % QUESTIONS.length];
}

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],

      ensureTodayQuestion: () => {
        const today = todayStr();
        const existing = get().entries.find((e) => e.date === today);
        if (!existing) {
          const newEntry: JournalEntry = {
            date: today,
            question: getQuestionForDate(today),
            answer: '',
            answeredAt: null,
          };
          set((state) => ({ entries: [...state.entries.slice(-60), newEntry] }));
        }
      },

      answerTodayQuestion: (answer) => {
        const today = todayStr();
        set((state) => ({
          entries: state.entries.map((e) =>
            e.date === today
              ? { ...e, answer: answer.trim(), answeredAt: Date.now() }
              : e
          ),
        }));
      },

      getTodayEntry: () => {
        const today = todayStr();
        return get().entries.find((e) => e.date === today) ?? null;
      },

      isTodayAnswered: () => {
        const entry = get().getTodayEntry();
        return !!entry && !!entry.answer && entry.answer.length > 0;
      },

      // Блокер показывается после 20:00 если вопрос не отвечен
      shouldShowBlocker: () => {
        const now = new Date();
        const hour = now.getHours();
        if (hour < 20) return false;
        return !get().isTodayAnswered();
      },
    }),
    {
      name: 'solo-leveling-journal',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
