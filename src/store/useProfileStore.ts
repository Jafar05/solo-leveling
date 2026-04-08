import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, WeeklyReport, StatKey, Stat, JournalTask, Book, BookPractice } from '../engine/types';
import { generateJournalQuestion, generateWeeklyReport, analyzeJournalAnswer } from '../engine/ai';
import { checkTitleUnlock } from '../engine/titles';
import { todayStr } from '../engine/xp';
import type { Character } from '../engine/types';

interface ProfileStore {
  // Титулы
  unlockedTitleIds: string[];
  activeTitleId: string | null;
  newlyUnlockedTitleIds: string[]; // для анимации/уведомления

  // Дерево навыков
  unlockedSkillIds: string[];

  // Дневник
  journalEntries: JournalEntry[];
  todayQuestion: string | null;
  isLoadingQuestion: boolean;

  // Задания из дневника
  journalTasks: JournalTask[];
  isAnalyzingJournal: boolean;

  // Книги
  books: Book[];
  isAddingBook: boolean;

  // Еженедельный отчёт
  weeklyReports: WeeklyReport[];
  isGeneratingReport: boolean;
  lastReportWeek: string | null; // YYYY-Www

  // Actions
  checkAndUnlockTitles: (character: Character) => string[];
  setActiveTitle: (id: string | null) => void;
  clearNewTitles: () => void;
  addJournalEntryFromBlocker: (question: string, answer: string) => void;
  unlockSkill: (id: string) => void;
  loadJournalQuestion: (stats: Record<StatKey, Stat>, apiKey: string) => Promise<void>;
  saveJournalAnswer: (answer: string, stats: Record<StatKey, Stat>, apiKey: string) => Promise<void>;
  completeJournalTask: (taskId: string) => void;
  deleteJournalTask: (taskId: string) => void;
  addBook: (book: Omit<Book, 'id' | 'addedAt' | 'practices'>) => void;
  updateBookProgress: (bookId: string, currentPage: number) => void;
  updateBookStatus: (bookId: string, status: Book['status']) => void;
  completeBookPractice: (bookId: string, practiceId: string) => void;
  addBookPractice: (bookId: string, description: string) => void;
  deleteBook: (bookId: string) => void;
  generateReport: (
    stats: Record<StatKey, Stat>,
    weeklyXP: { date: string; xp: number }[],
    recentLogs: { description: string; stat: StatKey; finalXP: number }[],
    apiKey: string
  ) => Promise<void>;
  shouldGenerateReport: () => boolean;
}

function currentWeekKey(): string {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const year = start.getFullYear();
  const week = Math.ceil(((start.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function mondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().split('T')[0];
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      unlockedTitleIds: [],
      activeTitleId: null,
      newlyUnlockedTitleIds: [],
      unlockedSkillIds: [],
      journalEntries: [],
      todayQuestion: null,
      isLoadingQuestion: false,
      journalTasks: [],
      isAnalyzingJournal: false,
      books: [],
      isAddingBook: false,
      weeklyReports: [],
      isGeneratingReport: false,
      lastReportWeek: null,

      checkAndUnlockTitles: (character) => {
        const { unlockedTitleIds } = get();
        const newTitles = checkTitleUnlock(character, unlockedTitleIds);
        if (newTitles.length === 0) return [];

        const newIds = newTitles.map((t) => t.id);
        set((state) => ({
          unlockedTitleIds: [...state.unlockedTitleIds, ...newIds],
          newlyUnlockedTitleIds: [...state.newlyUnlockedTitleIds, ...newIds],
          activeTitleId: state.activeTitleId ?? newIds[0],
        }));
        return newIds;
      },

      setActiveTitle: (id) => set({ activeTitleId: id }),

      clearNewTitles: () => set({ newlyUnlockedTitleIds: [] }),

      addJournalEntryFromBlocker: (question, answer) => {
        const today = todayStr();
        const existing = get().journalEntries.find((e) => e.date === today);
        if (existing) return;
        const entry: JournalEntry = {
          id: `journal_${Date.now()}`,
          date: today,
          question,
          answer,
          createdAt: Date.now(),
        };
        set((state) => ({
          journalEntries: [...state.journalEntries, entry].slice(-365),
        }));
      },

      unlockSkill: (id) =>
        set((state) => ({ unlockedSkillIds: [...state.unlockedSkillIds, id] })),

      loadJournalQuestion: async (stats, apiKey) => {
        const { journalEntries, todayQuestion } = get();
        const today = todayStr();

        // Уже есть вопрос сегодня — не перегенерировать
        const todayEntry = journalEntries.find((e) => e.date === today);
        if (todayEntry || todayQuestion) return;

        set({ isLoadingQuestion: true });
        try {
          const recentAnswers = journalEntries.slice(-5).map((e) => e.answer);
          const question = await generateJournalQuestion(stats, apiKey, recentAnswers);
          set({ todayQuestion: question });
        } catch {
          set({ todayQuestion: 'Что сегодня дало тебе больше всего энергии?' });
        } finally {
          set({ isLoadingQuestion: false });
        }
      },

      saveJournalAnswer: async (answer, stats, apiKey) => {
        const { todayQuestion, journalEntries, journalTasks, books } = get();
        if (!todayQuestion || !answer.trim()) return;

        const today = todayStr();
        const existing = journalEntries.find((e) => e.date === today);
        if (existing) return; // уже сохранено

        const entry: JournalEntry = {
          id: `journal_${Date.now()}`,
          date: today,
          question: todayQuestion,
          answer: answer.trim(),
          createdAt: Date.now(),
        };

        // Запускаем AI анализ ответа (в фоне)
        let newTasks: JournalTask[] = [];
        if (apiKey) {
          set({ isAnalyzingJournal: true });
          try {
            const analysis = await analyzeJournalAnswer(
              answer.trim(),
              todayQuestion,
              stats,
              apiKey,
              journalTasks,
              books
            );

            // Создаём задания из анализа
            newTasks = analysis.tasks.map((t) => ({
              ...t,
              id: `jtask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              sourceEntryId: entry.id,
              createdAt: Date.now(),
              completed: false,
              completedAt: null,
            }));

            // Добавляем рекомендованные книги (если их ещё нет)
            const existingTitles = new Set(books.map((b) => b.title.toLowerCase()));
            const newBooks: Book[] = analysis.bookRecommendations
              .filter((b) => !existingTitles.has(b.title.toLowerCase()))
              .map((b) => ({
                id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                title: b.title,
                author: b.author,
                category: b.category,
                relatedStat: b.relatedStat,
                totalPages: 0, // пользователь заполнит сам
                currentPage: 0,
                status: 'want' as const,
                addedAt: Date.now(),
                startedAt: null,
                completedAt: null,
                practices: [],
                notes: b.reason,
              }));

            if (newBooks.length > 0 || newTasks.length > 0) {
              set((state) => ({
                journalEntries: [...state.journalEntries, entry].slice(-365),
                todayQuestion: null,
                journalTasks: [...state.journalTasks, ...newTasks],
                books: [...state.books, ...newBooks],
              }));
            } else {
              set((state) => ({
                journalEntries: [...state.journalEntries, entry].slice(-365),
                todayQuestion: null,
              }));
            }
          } catch (e) {
            console.error('Journal analysis failed', e);
            set((state) => ({
              journalEntries: [...state.journalEntries, entry].slice(-365),
              todayQuestion: null,
            }));
          } finally {
            set({ isAnalyzingJournal: false });
          }
        } else {
          // Без API ключа — просто сохраняем ответ
          set((state) => ({
            journalEntries: [...state.journalEntries, entry].slice(-365),
            todayQuestion: null,
          }));
        }
      },

      completeJournalTask: (taskId) => {
        set((state) => ({
          journalTasks: state.journalTasks.map((t) =>
            t.id === taskId ? { ...t, completed: true, completedAt: Date.now() } : t
          ),
        }));
      },

      deleteJournalTask: (taskId) => {
        set((state) => ({
          journalTasks: state.journalTasks.filter((t) => t.id !== taskId),
        }));
      },

      addBook: (book) => {
        const newBook: Book = {
          ...book,
          id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          addedAt: Date.now(),
          practices: [],
        };
        set((state) => ({ books: [...state.books, newBook] }));
      },

      updateBookProgress: (bookId, currentPage) => {
        set((state) => ({
          books: state.books.map((b) => {
            if (b.id !== bookId) return b;
            const newStatus = b.status === 'want' ? 'reading' : b.status;
            return {
              ...b,
              currentPage,
              status: newStatus,
              startedAt: b.startedAt ?? Date.now(),
            };
          }),
        }));
      },

      updateBookStatus: (bookId, status) => {
        set((state) => ({
          books: state.books.map((b) => {
            if (b.id !== bookId) return b;
            return {
              ...b,
              status,
              completedAt: status === 'completed' ? Date.now() : b.completedAt,
              startedAt: b.startedAt ?? (status === 'reading' ? Date.now() : null),
            };
          }),
        }));
      },

      completeBookPractice: (bookId, practiceId) => {
        set((state) => ({
          books: state.books.map((b) => {
            if (b.id !== bookId) return b;
            return {
              ...b,
              practices: b.practices.map((p) =>
                p.id === practiceId ? { ...p, completed: true, completedAt: Date.now() } : p
              ),
            };
          }),
        }));
      },

      addBookPractice: (bookId, description) => {
        const practice: BookPractice = {
          id: `practice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          description,
          completed: false,
          completedAt: null,
        };
        set((state) => ({
          books: state.books.map((b) => {
            if (b.id !== bookId) return b;
            return { ...b, practices: [...b.practices, practice] };
          }),
        }));
      },

      deleteBook: (bookId) => {
        set((state) => ({ books: state.books.filter((b) => b.id !== bookId) }));
      },

      generateReport: async (stats, weeklyXP, recentLogs, apiKey) => {
        set({ isGeneratingReport: true });
        try {
          const data = await generateWeeklyReport(stats, weeklyXP, recentLogs, apiKey);
          const weekKey = currentWeekKey();
          const report: WeeklyReport = {
            id: `report_${Date.now()}`,
            weekStart: mondayOfCurrentWeek(),
            generatedAt: Date.now(),
            ...data,
          };
          set((state) => ({
            weeklyReports: [...state.weeklyReports, report].slice(-12),
            lastReportWeek: weekKey,
          }));
        } catch (e) {
          console.error('Report generation failed', e);
        } finally {
          set({ isGeneratingReport: false });
        }
      },

      shouldGenerateReport: () => {
        const { lastReportWeek } = get();
        const now = new Date();
        // Генерировать по воскресеньям
        if (now.getDay() !== 0) return false;
        return lastReportWeek !== currentWeekKey();
      },
    }),
    {
      name: 'solo-leveling-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
