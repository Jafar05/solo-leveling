import OpenAI from 'openai';
import { StatKey, Stat } from './types';
import { getDaysWithoutActivity } from './xp';
import { BehavioralProfile, buildProfileSummaryForAI } from './adaptiveEngine';

export interface GeneratedQuest {
  id: string;
  title: string;
  description: string;
  stat: StatKey;
  type: 'daily' | 'story' | 'boss';
  xpReward: number;
  emoji: string;
  difficulty: 'easy' | 'normal' | 'hard';
  // Для story/boss — требуемый уровень
  requiredLevel?: number;
  requiredStat?: StatKey;
  // Срок (для daily — дата генерации)
  generatedAt: number;
  expiresAt?: number; // timestamp для daily квестов
}

const STAT_LABELS: Record<StatKey, string> = {
  str: 'Сила (тренировки, спорт, физическая активность)',
  int: 'Интеллект (чтение книг, учёба, курсы, самообразование)',
  cha: 'Харизма (публичные выступления, лидерство, влияние на людей)',
  soc: 'Социальная жизнь (знакомства, девушки, тусовки, мероприятия)',
  biz: 'Бизнес (работа, проекты, сделки, деньги, карьера)',
  vit: 'Здоровье (питание, сон, восстановление, медицина)',
  wil: 'Воля (дисциплина, страх, преодоление, холодный душ, ранний подъём)',
  sty: 'Стиль (одежда, грумминг, внешний вид, новые места, маршруты)',
  kar: 'Карма (добрые дела, помощь людям, благотворительность, менторство)',
};

function buildQuestPrompt(
  stats: Record<StatKey, Stat>,
  type: 'daily' | 'story' | 'boss',
  count: number,
  excludeStats: StatKey[] = [],
  profile?: BehavioralProfile,
  lifeContext?: string
): string {
  const statsInfo = (Object.keys(stats) as StatKey[]).map((k) => {
    const days = getDaysWithoutActivity(stats[k]);
    const label = STAT_LABELS[k];
    return `${k}: Lv.${stats[k].level}${days > 2 ? ` (не активен ${days} дн)` : ''} — ${label}`;
  }).join('\n');

  const excludeNote = excludeStats.length > 0
    ? `\nНЕ генерируй квесты для статов: ${excludeStats.join(', ')} — они уже выполнены сегодня.`
    : '';

  const profileNote = profile ? `\n${buildProfileSummaryForAI(profile)}\n` : '';
  const lifeNote = lifeContext ? `\n${lifeContext}\n` : '';

  const focusStats = profile?.focusSuggestion ?? [];
  const focusNote = focusStats.length > 0
    ? `Приоритетные статы для квестов сегодня: ${focusStats.join(', ')}.`
    : '';

  const typeInstructions: Record<string, string> = {
    daily: `Ежедневные квесты — конкретные действия которые можно сделать сегодня.
Простые, реалистичные, занимают 10-120 минут.

🔥 КРИТИЧЕСКИ ВАЖНО: КАЖДЫЙ из ${count} квестов должен быть на РАЗНУЮ сферу (stat).
НЕ повторяй один и тот же stat дважды. Все ${count} квестов — разные статы.
Если фокус на BIZ — это не значит что все квесты про бизнес. Это значит BIZ будет одним из квестов.

Распределяй квесты по ВСЕМ сферам жизни:
- Не только бизнес/работа — прокачивай общение, здоровье, стиль, карму, волю
- Универсальные челленджи: подойти к незнакомцу, сделать 3 вещи которые ты не делал, сходить в новое место
- Социальные: заговорить с незнакомым человеком, написать старому другу, сделать комплимент
- Воля: холодный душ, встать раньше, сделать то чего боишься
- Стиль: попробовать новый образ, сходить в новое место, изменить маршрут
- Карма: помочь незнакомцу, сделать доброе дело, написать благодарность
- Здоровье: новая тренировка, здоровая еда, ранний сон
- Интеллект: прочитать главу, изучить новую тему, посмотреть обучающее видео

${focusNote}
XP: 15-50 за квест.`,

    story: `Сюжетные квесты — цели на 1-2 недели, требуют усилий.
Должны быть вдохновляющими и конкретными.
Учитывай уровни пользователя — для Lv.1-5 простые цели, для Lv.10+ амбициозные.

🔥 ВАЖНО: Распределяй квесты по РАЗНЫМ сферам. Не фокусируйся только на одной.
Примеры разнообразия:
- Социальные: подойти и заговорить с незнакомым человеком, сходить на мероприятие
- Личностные: сделать 3 вещи которые ты никогда не делал, преодолеть конкретный страх
- Профессиональные: запустить побочный проект, найти первого клиента
- Физические: подготовиться к забегу, освоить новое упражнение

${focusNote}
XP: 100-500 за квест.
Добавь requiredLevel и requiredStat где нужно.`,

    boss: `Боссы — масштабные достижения, на месяц и больше.
Должны ощущаться как настоящее испытание. Один раз в жизни или редко.

🔥 ВАЖНО: Боссы должны покрывать РАЗНЫЕ сферы жизни — не только работу/бизнес.
Примеры: марафон (STR), 100 знакомств (SOC), запуск продукта (BIZ), выступление на конференции (CHA).

XP: 1000-5000 за квест.
Добавь requiredLevel (минимум 10+) и requiredStat.`,
  };

  return `Ты генератор квестов для RPG-приложения прокачки реальной жизни.

СТАТЫ ПОЛЬЗОВАТЕЛЯ:
${statsInfo}
${profileNote}${lifeNote}
ЗАДАЧА: Сгенерируй ${count} уникальных ${type === 'daily' ? 'ежедневных' : type === 'story' ? 'сюжетных' : 'квестов-боссов'}.

⚡ ГЛАВНОЕ ПРАВИЛО БАЛАНСА: Прокачивай ВСЕ сферы жизни равномерно.
Не зацикливайся на одной сфере (особенно на бизнесе/работе).
Жизнь — это не только работа. Охотник развивает: силу, ум, общение, стиль, здоровье, волю, карму.
Если пользователь пишет только про бизнес — это НЕ значит что все квесты про бизнес.
Это значит что бизнес — ОДИН ИЗ квестов. Остальные — другие сферы.

🎯 УНИВЕРСАЛЬНЫЕ ЧЕЛЛЕНДЖИ (включай их в квесты):
• Подойти и заговорить с незнакомым человеком
• Сделать 3 вещи которые ты никогда не делал
• Сходить в места где ты ещё не был
• Изменить привычный маршрут (дом-работа-дом)
• Попробовать еду которую никогда не ел
• Написать человеку которого давно не писал
• Сделать то чего боишься
• Помочь незнакомому человеку
• Надеть что-то необычное/новое
• Встать на 1 час раньше обычного

${typeInstructions[type]}
${excludeNote}
Верни ТОЛЬКО валидный JSON массив без markdown:
[
  {
    "title": "Утренний воин",
    "description": "Встань до 7 утра и сделай зарядку 15 минут",
    "stat": "wil",
    "xpReward": 30,
    "emoji": "⚡",
    "difficulty": "normal",
    "requiredLevel": null,
    "requiredStat": null
  }
]

Квесты должны быть на РУССКОМ языке. Делай их живыми и мотивирующими.`;
}

export async function generateQuests(
  type: 'daily' | 'story' | 'boss',
  count: number,
  stats: Record<StatKey, Stat>,
  apiKey: string,
  excludeStats: StatKey[] = [],
  profile?: BehavioralProfile,
  lifeContext?: string
): Promise<GeneratedQuest[]> {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: buildQuestPrompt(stats, type, count, excludeStats, profile, lifeContext) },
    ],
    temperature: 0.8, // Выше для разнообразия квестов
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Не удалось сгенерировать квесты');

  const parsed: any[] = JSON.parse(jsonMatch[0]);
  const now = Date.now();

  const validStats: StatKey[] = ['str', 'int', 'cha', 'soc', 'biz', 'vit', 'wil', 'sty', 'kar'];
  const availableStats = validStats.filter((s) => !excludeStats.includes(s));

  // Пост-обработка: для daily квестов гарантируем уникальные статы
  let processed = parsed.slice(0, count).map((q, i) => ({
    id: `ai_${type}_${now}_${i}`,
    title: q.title ?? 'Новый квест',
    description: q.description ?? '',
    stat: validStats.includes(q.stat) ? q.stat : 'wil',
    type,
    xpReward: Math.max(10, q.xpReward ?? 30),
    emoji: q.emoji ?? '⚡',
    difficulty: ['easy', 'normal', 'hard'].includes(q.difficulty) ? q.difficulty : 'normal',
    requiredLevel: q.requiredLevel ?? undefined,
    requiredStat: validStats.includes(q.requiredStat) ? q.requiredStat : undefined,
    generatedAt: now,
    expiresAt: type === 'daily' ? now + 24 * 60 * 60 * 1000 : undefined,
  }));

  // Для daily: если есть дубликаты статов — переназначаем
  if (type === 'daily') {
    const usedStats = new Set<StatKey>();
    const duplicates: number[] = [];

    for (let i = 0; i < processed.length; i++) {
      const q = processed[i];
      if (usedStats.has(q.stat) || excludeStats.includes(q.stat)) {
        duplicates.push(i);
      } else {
        usedStats.add(q.stat);
      }
    }

    // Переназначаем дубликаты на свободные статы
    const freeStats = availableStats.filter((s) => !usedStats.has(s));
    for (let i = 0; i < duplicates.length && freeStats.length > 0; i++) {
      const idx = duplicates[i];
      processed[idx].stat = freeStats[i % freeStats.length];
      usedStats.add(freeStats[i % freeStats.length]);
    }
  }

  return processed;
}
