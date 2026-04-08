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
  str: 'Сила (физическая активность)',
  int: 'Интеллект (чтение, учёба)',
  cha: 'Харизма (общение, выступления)',
  soc: 'Социальная жизнь (знакомства, девушки)',
  biz: 'Бизнес (работа, сделки)',
  vit: 'Здоровье (питание, сон)',
  wil: 'Воля (дисциплина, преодоление страха)',
  sty: 'Стиль (одежда, грумминг, внешний вид)',
  kar: 'Карма (добрые дела, помощь людям)',
};

function buildQuestPrompt(
  stats: Record<StatKey, Stat>,
  type: 'daily' | 'story' | 'boss',
  count: number,
  excludeStats: StatKey[] = [],
  profile?: BehavioralProfile
): string {
  const statsInfo = (Object.keys(stats) as StatKey[]).map((k) => {
    const days = getDaysWithoutActivity(stats[k]);
    return `${k}: Lv.${stats[k].level}${days > 2 ? ` (не активен ${days} дн)` : ''}`;
  }).join(', ');

  const excludeNote = excludeStats.length > 0
    ? `\nНЕ генерируй квесты для статов: ${excludeStats.join(', ')} — они уже выполнены сегодня.`
    : '';

  const profileNote = profile ? `\n${buildProfileSummaryForAI(profile)}\n` : '';

  const focusStats = profile?.focusSuggestion ?? [];
  const focusNote = focusStats.length > 0
    ? `Приоритетные статы для квестов сегодня: ${focusStats.join(', ')}.`
    : '';

  const typeInstructions: Record<string, string> = {
    daily: `Ежедневные квесты — конкретные действия которые можно сделать сегодня.
Простые, реалистичные, занимают 10-120 минут.
${focusNote}
XP: 15-50 за квест.`,

    story: `Сюжетные квесты — цели на 1-2 недели, требуют усилий.
Должны быть вдохновляющими и конкретными.
Учитывай уровни пользователя — для Lv.1-5 простые цели, для Lv.10+ амбициозные.
${focusNote}
XP: 100-500 за квест.
Добавь requiredLevel и requiredStat где нужно.`,

    boss: `Боссы — масштабные достижения, на месяц и больше.
Должны ощущаться как настоящее испытание. Один раз в жизни или редко.
XP: 1000-5000 за квест.
Добавь requiredLevel (минимум 10+) и requiredStat.`,
  };

  return `Ты генератор квестов для RPG-приложения прокачки реальной жизни.

СТАТЫ ПОЛЬЗОВАТЕЛЯ: ${statsInfo}
${profileNote}
ЗАДАЧА: Сгенерируй ${count} уникальных ${type === 'daily' ? 'ежедневных' : type === 'story' ? 'сюжетных' : 'квестов-боссов'}.

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
  profile?: BehavioralProfile
): Promise<GeneratedQuest[]> {
  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: buildQuestPrompt(stats, type, count, excludeStats, profile) },
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

  return parsed.slice(0, count).map((q, i) => ({
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
}
