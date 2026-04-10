import OpenAI from 'openai';
import { StatKey, ALL_STAT_KEYS } from './types';
import { SphereContext, CoachInsight } from '../store/useLifeProfileStore';
import { BehavioralProfile } from './adaptiveEngine';

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

function makeClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

// Извлекает контексты сфер из свободного текста пользователя
export async function extractSphereContexts(
  userText: string,
  existing: Partial<Record<StatKey, SphereContext>>,
  apiKey: string
): Promise<Partial<Record<StatKey, SphereContext>>> {
  const client = makeClient(apiKey);

  const statsDesc = ALL_STAT_KEYS.map((k) => `"${k}": ${STAT_FULL[k]}`).join(', ');

  const prompt = `Ты аналитик личного развития. Пользователь описывает свою жизнь.

ТЕКСТ: "${userText}"

ВОЗМОЖНЫЕ СФЕРЫ (stat: название): ${statsDesc}

Проанализируй и извлеки контекст для ВСЕХ упомянутых или подразумеваемых сфер.
Для каждой сферы заполни:
- situation: краткое текущее состояние (1-2 предложения, факты)
- goal: конкретная цель которую человек хочет достичь
- blocker: главное препятствие (если упоминается, иначе пустая строка)

Верни ТОЛЬКО валидный JSON без markdown и объяснений:
{
  "biz": { "situation": "...", "goal": "...", "blocker": "..." }
}
Включай только реально упомянутые или явно подразумеваемые сферы.`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  const parsed = JSON.parse(jsonMatch[0]);
  const now = Date.now();
  const result: Partial<Record<StatKey, SphereContext>> = {};

  for (const stat of ALL_STAT_KEYS) {
    if (parsed[stat]?.situation) {
      result[stat] = {
        stat,
        situation: parsed[stat].situation ?? '',
        goal: parsed[stat].goal ?? '',
        blocker: parsed[stat].blocker ?? '',
        updatedAt: now,
      };
    }
  }

  return result;
}

// Генерирует динамическую роль AI + экспертный совет за один вызов
export async function generateCoachInsight(
  sphereContexts: Partial<Record<StatKey, SphereContext>>,
  behavioralProfile: BehavioralProfile,
  apiKey: string
): Promise<CoachInsight> {
  const client = makeClient(apiKey);

  const activeContexts = Object.values(sphereContexts).filter(Boolean) as SphereContext[];

  const lifeProfile = activeContexts
    .map((c) => {
      let line = `${STAT_FULL[c.stat]}: ${c.situation}. Цель: ${c.goal}`;
      if (c.blocker) line += `. Препятствие: ${c.blocker}`;
      return line;
    })
    .join('\n');

  const neglected = behavioralProfile.neglectedStats.map((s) => STAT_FULL[s]).join(', ') || 'нет';

  // Определяем приоритетную сферу для совета
  const focusStat = behavioralProfile.focusSuggestion[0] ?? activeContexts[0]?.stat ?? 'wil';
  const focusCtx = sphereContexts[focusStat] ?? activeContexts[0];
  const focusLine = focusCtx
    ? `ПРИОРИТЕТ СЕГОДНЯ: ${STAT_FULL[focusCtx.stat]} — "${focusCtx.goal}"`
    : '';

  const prompt = `Ты аналитик и коуч по личному развитию. На основе профиля пользователя выполни два шага.

ЖИЗНЕННЫЙ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:
${lifeProfile || 'Данных пока нет — дай общий совет по личному развитию.'}

ПОВЕДЕНЧЕСКАЯ СТАТИСТИКА:
- Стабильность: ${behavioralProfile.consistencyScore}% активных дней
- Баланс развития: ${behavioralProfile.balanceScore}/100
- Запущенные сферы (7+ дней без активности): ${neglected}
${focusLine}

ШАГ 1: Определи свою роль как эксперта. Конкретно — с реальным опытом в нужных сферах.
Пример: "Ты серийный предприниматель запустивший 8 продуктов и спортивный психолог"

ШАГ 2: От лица этого эксперта дай ОДИН конкретный инсайт или действие на сегодня.
- Конкретно под реальную ситуацию пользователя (не абстрактно)
- Почему именно это важно прямо сейчас
- 2–4 предложения
- На русском, как разговор тет-а-тет

Верни ТОЛЬКО валидный JSON без markdown:
{
  "role": "Ты ...",
  "insight": "...",
  "stat": "biz"
}`;

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.75,
    max_tokens: 400,
  });

  const raw = response.choices[0]?.message?.content ?? '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      text: raw.trim(),
      role: 'Топ-коуч по личному развитию',
      stat: focusStat,
      generatedAt: Date.now(),
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validStats = ALL_STAT_KEYS;

  return {
    text: parsed.insight ?? '',
    role: parsed.role ?? 'Топ-коуч по личному развитию',
    stat: validStats.includes(parsed.stat) ? parsed.stat : focusStat,
    generatedAt: Date.now(),
  };
}
