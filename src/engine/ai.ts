import OpenAI from 'openai';
import { StatKey, Difficulty, Stat, DailyStats, WeeklyReport, JournalEntry, JournalTask, Book, BookPractice } from './types';
import { ALL_STAT_KEYS } from './types';

export interface AIActionResult {
  stat: StatKey;
  difficulty: Difficulty;
  durationMinutes: number;
  description: string;
  xpBonus: number;
  milestones: string[];
  coachNote: string;
  levelPenaltyNote: string;
}

export interface AIParseResult {
  actions: AIActionResult[];
  needsClarification: boolean;
  clarificationQuestion: string;
}

const VALID_STATS: StatKey[] = ALL_STAT_KEYS;
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

function buildSystemPrompt(stats: Record<StatKey, Stat>): string {
  const statsContext = VALID_STATS.map((k) => `${k}: Lv.${stats[k].level}`).join(', ');

  return `Ты AI-коуч приложения для прокачки реальной жизни в стиле RPG.

УРОВНИ ПОЛЬЗОВАТЕЛЯ СЕЙЧАС: ${statsContext}

ПРАВИЛО УБЫВАЮЩЕЙ ОТДАЧИ (очень важно):
Чем выше уровень стата — тем меньше XP даёт обычное действие. Это как в реальной жизни: новичку
любая тренировка даёт рост, а профи нужны сверхусилия чтобы прогрессировать.
- Lv 1-10: difficulty = normal для большинства действий
- Lv 11-20: обычное действие = easy (привычка). Нужно "hard" чтобы расти
- Lv 21-30: даже "hard" привычных действий = normal. Нужны новые вызовы
- Lv 30+: нужны экстремальные/рекордные достижения чтобы получить "hard"

КАТЕГОРИИ СТАТОВ:
- str: физическая активность (тренировки, бег, спорт, турник, физический труд)
- int: интеллект (чтение, учёба, курсы, программирование, решение сложных задач)
- cha: харизма (публичные выступления, нетворкинг, переговоры, лидерство)
- soc: социальная жизнь / романтика (знакомства с девушками, свидания, флирт)
- biz: бизнес / работа (рабочие задачи, звонки, сделки, запуск продуктов)
- vit: здоровье (питание, сон, медитация, восстановление, режим дня)
- wil: воля / дисциплина (преодоление страха, отказ от соблазнов, ранний подъём)
- sty: стиль (покупка одежды, уход за собой, причёска, грумминг, обустройство пространства)
- kar: карма (добрые дела, помощь незнакомым, волонтёрство, поддержка близких)

МУЛЬТИ-СТАТ: Одно действие может затрагивать несколько статов. Например:
"запустил приложение" → biz (продукт) + int (программирование)
"подошёл к девушке после тренировки" → soc + str
"купил новый костюм и почувствовал уверенность" → sty + cha
В таком случае верни массив из нескольких объектов action.

MILESTONES (бонус xpBonus поверх обычного XP):
- Взял номер телефона: +60
- Назначил свидание: +80
- Свидание состоялось: +120
- Поцелуй: +150
- Закрыл сделку / продажу: +100
- Запустил проект / продукт: +300
- Дочитал книгу: +50
- Завершил курс: +100
- Пробежал 10+ км: +60
- Публичное выступление перед аудиторией: +80
- Первый раз в жизни: +100
- Личный рекорд: +80
- Помог незнакомому человеку: +40
- Сделал доброе дело: +30

ДЛИТЕЛЬНОСТЬ: Оцени в минутах. Если не упомянута вообще и неочевидна — укажи durationUnknown: true.

ВЕРНИ ТОЛЬКО валидный JSON без markdown:
{
  "actions": [
    {
      "stat": "biz",
      "difficulty": "hard",
      "durationMinutes": 480,
      "description": "Запустил приложение для личного развития",
      "xpBonus": 300,
      "milestones": ["Запустил проект / продукт"],
      "coachNote": "Создать и запустить продукт в одиночку — это S-ранговое достижение.",
      "levelPenaltyNote": ""
    }
  ],
  "needsClarification": false,
  "clarificationQuestion": ""
}`;
}

function validateAction(raw: any): AIActionResult {
  return {
    stat: VALID_STATS.includes(raw.stat) ? raw.stat : 'wil',
    difficulty: VALID_DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'normal',
    durationMinutes: Math.min(1440, Math.max(1, raw.durationMinutes ?? 30)),
    description: raw.description ?? '',
    xpBonus: Math.max(0, raw.xpBonus ?? 0),
    milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
    coachNote: raw.coachNote ?? '',
    levelPenaltyNote: raw.levelPenaltyNote ?? '',
  };
}

function makeClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export async function parseActionWithAI(
  userInput: string,
  apiKey: string,
  stats: Record<StatKey, Stat>
): Promise<AIParseResult> {
  const client = makeClient(apiKey);

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: buildSystemPrompt(stats) },
      { role: 'user', content: userInput },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI вернул некорректный ответ');

  const parsed = JSON.parse(jsonMatch[0]);

  const actions: AIActionResult[] = Array.isArray(parsed.actions)
    ? parsed.actions.map(validateAction)
    : [validateAction(parsed)];

  return {
    actions,
    needsClarification: !!parsed.needsClarification,
    clarificationQuestion: parsed.clarificationQuestion ?? '',
  };
}

// ─── Дневник: вечерний вопрос ─────────────────────────────────────────────────

export async function generateJournalQuestion(
  stats: Record<StatKey, Stat>,
  apiKey: string,
  recentAnswers: string[]
): Promise<string> {
  const client = makeClient(apiKey);

  const statsContext = ALL_STAT_KEYS.map((k) => `${k}: Lv.${stats[k].level}`).join(', ');
  const recentContext = recentAnswers.length > 0
    ? `\nПоследние записи пользователя:\n${recentAnswers.slice(-3).join('\n')}`
    : '';

  const prompt = `Ты психолог-коуч для RPG-приложения прокачки реальной жизни.

УРОВНИ: ${statsContext}${recentContext}

Придумай ОДИН вечерний вопрос для рефлексии — глубокий, провокационный, заставляющий думать.
Вопрос должен помочь пользователю осознать свой прогресс, ошибки или возможности.
Пиши на русском. 1-2 предложения. БЕЗ кавычек и лишних символов. Только сам вопрос.`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content?.trim() ?? 'Что сегодня дало тебе больше всего энергии?';
}

// ─── Еженедельный отчёт ───────────────────────────────────────────────────────

export async function generateWeeklyReport(
  stats: Record<StatKey, Stat>,
  weeklyXP: { date: string; xp: number }[],
  recentLogs: { description: string; stat: StatKey; finalXP: number }[],
  apiKey: string
): Promise<Omit<WeeklyReport, 'id' | 'weekStart' | 'generatedAt'>> {
  const client = makeClient(apiKey);

  const statsContext = ALL_STAT_KEYS.map((k) => `${k}: Lv.${stats[k].level}`).join(', ');
  const totalXP = weeklyXP.reduce((s, d) => s + d.xp, 0);
  const logsText = recentLogs.slice(0, 20).map((l) => `- ${l.description} (${l.stat}, +${l.finalXP}XP)`).join('\n');
  const xpByDay = weeklyXP.map((d) => `${d.date}: ${d.xp}XP`).join(', ');

  const statXP: Partial<Record<StatKey, number>> = {};
  recentLogs.forEach((l) => {
    statXP[l.stat] = (statXP[l.stat] ?? 0) + l.finalXP;
  });
  const topStat = (Object.entries(statXP).sort((a, b) => b[1] - a[1])[0]?.[0] as StatKey) ?? null;
  const weakStat = ALL_STAT_KEYS.reduce((min, k) =>
    stats[k].level < stats[min].level ? k : min
  , ALL_STAT_KEYS[0]);

  const prompt = `Ты AI-коуч, пишешь еженедельный отчёт для RPG-приложения прокачки жизни.

СТАТЫ: ${statsContext}
XP за неделю по дням: ${xpByDay}
ИТОГО XP: ${totalXP}
ДЕЙСТВИЯ:
${logsText}

Напиши отчёт в формате JSON (только JSON, без markdown):
{
  "summary": "1-2 предложения общий вывод о неделе",
  "highlights": ["достижение 1", "достижение 2", "достижение 3"],
  "suggestions": ["совет 1 на следующую неделю", "совет 2", "совет 3"]
}

Пиши живо, как настоящий коуч. На русском.`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось сгенерировать отчёт');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    summary: parsed.summary ?? 'Хорошая неделя!',
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    topStat,
    weakStat,
    totalXP,
  };
}

// ─── Дневник: анализ ответов → задания ────────────────────────────────────────

export interface JournalAnalysisResult {
  tasks: Omit<JournalTask, 'id' | 'createdAt' | 'completed' | 'completedAt'>[];
  bookRecommendations: {
    title: string;
    author: string;
    category: string;
    relatedStat: StatKey;
    reason: string; // почему именно эта книга
  }[];
  weakAreas: StatKey[];
  insight: string; // общее наблюдение
}

export async function analyzeJournalAnswer(
  answer: string,
  question: string,
  stats: Record<StatKey, Stat>,
  apiKey: string,
  existingTasks: JournalTask[],
  currentBooks: Book[]
): Promise<JournalAnalysisResult> {
  const client = makeClient(apiKey);

  const statsContext = ALL_STAT_KEYS.map((k) => `${k}: Lv.${stats[k].level}`).join(', ');
  const existingTasksContext = existingTasks.length > 0
    ? `\nУже есть задания: ${existingTasks.filter(t => !t.completed).map(t => `${t.title} (${t.stat})`).join(', ')}`
    : '';
  const currentBooksContext = currentBooks.length > 0
    ? `\nСейчас читает: ${currentBooks.filter(b => b.status === 'reading').map(b => `${b.title} (${b.author})`).join(', ') || 'ничего'}
     В списке: ${currentBooks.filter(b => b.status === 'want').map(b => `${b.title} (${b.author})`).join(', ') || 'пусто'}`
    : '';

  const prompt = `Ты AI-коуч приложения для прокачки реальной жизни в стиле RPG.

УРОВНИ ПОЛЬЗОВАТЕЛЯ: ${statsContext}${existingTasksContext}${currentBooksContext}

КАТЕГОРИИ СТАТОВ:
- str: физическая активность (тренировки, бег, спорт)
- int: интеллект (чтение, учёба, программирование)
- cha: харизма (публичные выступления, нетворкинг, переговоры, обаяние)
- soc: социальная жизнь (знакомства, свидания, общение)
- biz: бизнес (рабочие задачи, звонки, сделки, продукты)
- vit: здоровье (питание, сон, медитация, режим)
- wil: воля (преодоление страха, дисциплина, ранний подъём)
- sty: стиль (одежда, грумминг, пространство)
- kar: карма (добрые дела, помощь, волонтёрство)

ВОПРОС ДНЕВНИКА: ${question}
ОТВЕТ ПОЛЬЗОВАТЕЛЯ: ${answer}

ПРОАНАЛИЗИРУЙ ответ и определи:
1. Слабые места (какие статы нуждаются в прокачке) — weakAreas (массив stat keys)
2. Конкретные ЗАДАНИЯ которые помогут исправить слабые места — tasks
3. Книги которые помогут решить выявленные проблемы — bookRecommendations (2-3 книги)
4. Общее наблюдение — insight

ПРАВИЛА ДЛЯ ЗАДАНИЙ:
- Задания должны быть КОНКРЕТНЫЕ и ВЫПОЛНИМЫЕ (не "стать увереннее", а "подойти к 3 незнакомым людям сегодня")
- Привязывай к стату который прокачивается
- Не дублируй уже существующие невыполненные задания
- 1-3 задания максимум

ПРАВИЛА ДЛЯ КНИГ:
- Рекомендуй РЕАЛЬНЫЕ существующие книги
- Книги из разных сфер (не только бизнес/саморазвитие)
- Укажи конкретную причину почему эта книга поможет
- Не предлагай книги которые уже в списке

ВЕРНИ ТОЛЬКО валидный JSON без markdown:
{
  "weakAreas": ["cha", "soc"],
  "tasks": [
    {
      "title": "Заговори с незнакомцем",
      "description": "Подойди к 3 незнакомым людям и начни разговор. Цель — не результат, а практика преодоления барьера.",
      "stat": "cha"
    }
  ],
  "bookRecommendations": [
    {
      "title": "Думай медленно... решай быстро",
      "author": "Даниэль Канеман",
      "category": "Психология",
      "relatedStat": "int",
      "reason": "Поможет понять когнитивные искажения которые мешают принимать решения"
    }
  ],
  "insight": "Ты осознаёшь проблему с уверенностью в общении, но пока избегаешь конкретных действий."
}`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 800,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      tasks: [],
      bookRecommendations: [],
      weakAreas: [],
      insight: '',
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const tasks: Omit<JournalTask, 'id' | 'createdAt' | 'completed' | 'completedAt'>[] = Array.isArray(parsed.tasks)
    ? parsed.tasks.slice(0, 3).map((t: any) => ({
        title: t.title ?? '',
        description: t.description ?? '',
        stat: ALL_STAT_KEYS.includes(t.stat) ? t.stat : 'wil' as StatKey,
        sourceEntryId: '', // заполнится в store
      }))
    : [];

  const bookRecommendations = Array.isArray(parsed.bookRecommendations)
    ? parsed.bookRecommendations.slice(0, 3).map((b: any) => ({
        title: b.title ?? '',
        author: b.author ?? '',
        category: b.category ?? 'Саморазвитие',
        relatedStat: (ALL_STAT_KEYS.includes(b.relatedStat) ? b.relatedStat : 'int') as StatKey,
        reason: b.reason ?? '',
      }))
    : [];

  const weakAreasRaw = Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [];
  const weakAreas = weakAreasRaw.filter((w: any) => ALL_STAT_KEYS.includes(w)) as StatKey[];

  return {
    tasks,
    bookRecommendations,
    weakAreas,
    insight: parsed.insight ?? '',
  };
}

