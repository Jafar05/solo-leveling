import { Title, TitleCondition, StatKey, Rank, Character } from './types';
import { characterLevel, getRank } from './xp';

export const ALL_TITLES: Title[] = [
  // ─── Общие ───────────────────────────────────────────────────────────────────
  { id: 'first_step',    name: 'Первый шаг',       emoji: '👣', rare: false,
    description: 'Достиг уровня 5',
    condition: { type: 'char_level', level: 5 } },
  { id: 'awakened',      name: 'Пробуждённый',     emoji: '⚡', rare: false,
    description: 'Достиг ранга D',
    condition: { type: 'rank', rank: 'D' } },
  { id: 'hunter',        name: 'Охотник',           emoji: '🗡️', rare: false,
    description: 'Достиг ранга C',
    condition: { type: 'rank', rank: 'C' } },
  { id: 'elite',         name: 'Элита',             emoji: '💎', rare: false,
    description: 'Достиг ранга B',
    condition: { type: 'rank', rank: 'B' } },
  { id: 'master',        name: 'Мастер',            emoji: '🏆', rare: true,
    description: 'Достиг ранга A',
    condition: { type: 'rank', rank: 'A' } },
  { id: 'legend',        name: 'Легенда',           emoji: '👑', rare: true,
    description: 'Достиг ранга S',
    condition: { type: 'rank', rank: 'S' } },

  // ─── Сила ──────────────────────────────────────────────────────────────────
  { id: 'iron_monk',     name: 'Железный Монах',    emoji: '🥊', rare: false,
    description: 'Сила достигла уровня 10',
    condition: { type: 'stat_level', stat: 'str', level: 10 } },
  { id: 'warrior',       name: 'Воин',              emoji: '⚔️', rare: false,
    description: 'Сила достигла уровня 20',
    condition: { type: 'stat_level', stat: 'str', level: 20 } },
  { id: 'berserker',     name: 'Берсерк',           emoji: '🔱', rare: true,
    description: 'Сила достигла уровня 30',
    condition: { type: 'stat_level', stat: 'str', level: 30 } },

  // ─── Интеллект ────────────────────────────────────────────────────────────
  { id: 'scholar',       name: 'Учёный',            emoji: '📚', rare: false,
    description: 'Интеллект достиг уровня 10',
    condition: { type: 'stat_level', stat: 'int', level: 10 } },
  { id: 'sage',          name: 'Мудрец',            emoji: '🔮', rare: true,
    description: 'Интеллект достиг уровня 25',
    condition: { type: 'stat_level', stat: 'int', level: 25 } },

  // ─── Харизма ──────────────────────────────────────────────────────────────
  { id: 'speaker',       name: 'Оратор',            emoji: '🎤', rare: false,
    description: 'Харизма достигла уровня 10',
    condition: { type: 'stat_level', stat: 'cha', level: 10 } },
  { id: 'commander',     name: 'Командир',          emoji: '🦁', rare: true,
    description: 'Харизма достигла уровня 25',
    condition: { type: 'stat_level', stat: 'cha', level: 25 } },

  // ─── Социальная жизнь ─────────────────────────────────────────────────────
  { id: 'socialite',     name: 'Светский',          emoji: '🎭', rare: false,
    description: 'Соц. жизнь достигла уровня 10',
    condition: { type: 'stat_level', stat: 'soc', level: 10 } },
  { id: 'heartbreaker',  name: 'Покоритель сердец', emoji: '💘', rare: true,
    description: 'Соц. жизнь достигла уровня 20',
    condition: { type: 'stat_level', stat: 'soc', level: 20 } },

  // ─── Бизнес ───────────────────────────────────────────────────────────────
  { id: 'entrepreneur',  name: 'Предприниматель',   emoji: '💼', rare: false,
    description: 'Бизнес достиг уровня 10',
    condition: { type: 'stat_level', stat: 'biz', level: 10 } },
  { id: 'tycoon',        name: 'Магнат',            emoji: '🏰', rare: true,
    description: 'Бизнес достиг уровня 25',
    condition: { type: 'stat_level', stat: 'biz', level: 25 } },

  // ─── Здоровье ─────────────────────────────────────────────────────────────
  { id: 'healthy',       name: 'Здоровяк',          emoji: '💪', rare: false,
    description: 'Здоровье достигло уровня 10',
    condition: { type: 'stat_level', stat: 'vit', level: 10 } },
  { id: 'immortal',      name: 'Нетленный',         emoji: '🌿', rare: true,
    description: 'Здоровье достигло уровня 25',
    condition: { type: 'stat_level', stat: 'vit', level: 25 } },

  // ─── Воля ─────────────────────────────────────────────────────────────────
  { id: 'disciplined',   name: 'Дисциплинированный',emoji: '🔥', rare: false,
    description: 'Воля достигла уровня 10',
    condition: { type: 'stat_level', stat: 'wil', level: 10 } },
  { id: 'unbreakable',   name: 'Несломленный',      emoji: '🛡️', rare: true,
    description: 'Воля достигла уровня 25',
    condition: { type: 'stat_level', stat: 'wil', level: 25 } },

  // ─── Стиль ────────────────────────────────────────────────────────────────
  { id: 'stylish',       name: 'Стильный',          emoji: '👔', rare: false,
    description: 'Стиль достиг уровня 10',
    condition: { type: 'stat_level', stat: 'sty', level: 10 } },
  { id: 'icon',          name: 'Икона стиля',       emoji: '👑', rare: true,
    description: 'Стиль достиг уровня 20',
    condition: { type: 'stat_level', stat: 'sty', level: 20 } },

  // ─── Карма ────────────────────────────────────────────────────────────────
  { id: 'good_soul',     name: 'Добрая душа',       emoji: '🌟', rare: false,
    description: 'Карма достигла уровня 10',
    condition: { type: 'stat_level', stat: 'kar', level: 10 } },
  { id: 'saint',         name: 'Святой',            emoji: '😇', rare: true,
    description: 'Карма достигла уровня 20',
    condition: { type: 'stat_level', stat: 'kar', level: 20 } },

  // ─── Стрики ───────────────────────────────────────────────────────────────
  { id: 'streak_7',      name: '7 дней подряд',     emoji: '🔢', rare: false,
    description: 'Активность 7 дней без пропусков',
    condition: { type: 'streak', days: 7 } },
  { id: 'streak_30',     name: 'Месяц без пропусков',emoji: '📅', rare: false,
    description: 'Активность 30 дней подряд',
    condition: { type: 'streak', days: 30 } },
  { id: 'streak_100',    name: '100 дней',          emoji: '💯', rare: true,
    description: '100 дней непрерывной активности',
    condition: { type: 'streak', days: 100 } },

  // ─── XP ───────────────────────────────────────────────────────────────────
  { id: 'xp_1000',       name: 'Тысячник',          emoji: '✨', rare: false,
    description: 'Набрал 1000 суммарного XP',
    condition: { type: 'total_xp', xp: 1000 } },
  { id: 'xp_10000',      name: 'Мастер XP',         emoji: '🌠', rare: true,
    description: 'Набрал 10000 суммарного XP',
    condition: { type: 'total_xp', xp: 10000 } },
];

export function checkTitleUnlock(character: Character, unlockedIds: string[]): Title[] {
  const charLevel = characterLevel(character.stats);
  const rank = getRank(charLevel);
  const totalXP = Object.values(character.stats).reduce((s, st) => s + st.totalXP, 0);

  return ALL_TITLES.filter((title) => {
    if (unlockedIds.includes(title.id)) return false;

    const cond = title.condition;
    switch (cond.type) {
      case 'stat_level':
        return character.stats[cond.stat].level >= cond.level;
      case 'streak':
        return character.streakDays >= cond.days;
      case 'char_level':
        return charLevel >= cond.level;
      case 'rank': {
        const rankOrder: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
        return rankOrder.indexOf(rank) >= rankOrder.indexOf(cond.rank);
      }
      case 'total_xp':
        return totalXP >= cond.xp;
      default:
        return false;
    }
  });
}
