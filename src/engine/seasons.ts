import { Season, StatKey } from './types';

// Сезоны генерируются помесячно — каждый месяц новый бонусный стат
const SEASON_SCHEDULE: { month: number; bonusStat: StatKey; name: string; emoji: string; description: string }[] = [
  { month: 1,  bonusStat: 'wil', name: 'Сезон Стальной Воли',      emoji: '❄️',  description: 'Январь — время ставить цели и закалять характер. +30% XP к Воле.' },
  { month: 2,  bonusStat: 'soc', name: 'Сезон Связей',              emoji: '💘',  description: 'Февраль — месяц отношений и новых знакомств. +30% XP к Соц. жизни.' },
  { month: 3,  bonusStat: 'vit', name: 'Сезон Пробуждения',         emoji: '🌱',  description: 'Март — весна, время заботиться о теле. +30% XP к Здоровью.' },
  { month: 4,  bonusStat: 'str', name: 'Сезон Физической Мощи',     emoji: '⚡',  description: 'Апрель — прокачай тело после зимы. +30% XP к Силе.' },
  { month: 5,  bonusStat: 'biz', name: 'Сезон Богатства',           emoji: '💰',  description: 'Май — активный деловой сезон. +30% XP к Бизнесу.' },
  { month: 6,  bonusStat: 'cha', name: 'Сезон Харизмы',             emoji: '✨',  description: 'Июнь — выйди в свет и блести. +30% XP к Харизме.' },
  { month: 7,  bonusStat: 'sty', name: 'Сезон Стиля',               emoji: '👑',  description: 'Июль — лето, время выглядеть на максимум. +30% XP к Стилю.' },
  { month: 8,  bonusStat: 'kar', name: 'Сезон Кармы',               emoji: '🌟',  description: 'Август — делай добрые дела и собирай энергию. +30% XP к Карме.' },
  { month: 9,  bonusStat: 'int', name: 'Сезон Знаний',              emoji: '📚',  description: 'Сентябрь — время учёбы и роста разума. +30% XP к Интеллекту.' },
  { month: 10, bonusStat: 'biz', name: 'Сезон Урожая',              emoji: '🎯',  description: 'Октябрь — закрывай сделки и собирай плоды. +30% XP к Бизнесу.' },
  { month: 11, bonusStat: 'wil', name: 'Сезон Тьмы и Силы',         emoji: '🔥',  description: 'Ноябрь — преодолей серость и мрак силой воли. +30% XP к Воле.' },
  { month: 12, bonusStat: 'vit', name: 'Сезон Восстановления',      emoji: '🎄',  description: 'Декабрь — время отдыха, здоровья и перезарядки. +30% XP к Здоровью.' },
];

export function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const schedule = SEASON_SCHEDULE.find((s) => s.month === month)!;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  return {
    id: `season_${year}_${month}`,
    name: schedule.name,
    emoji: schedule.emoji,
    bonusStat: schedule.bonusStat,
    multiplier: 1.3,
    startDate,
    endDate,
    description: schedule.description,
  };
}

export function getSeasonMultiplier(stat: StatKey): number {
  const season = getCurrentSeason();
  return season.bonusStat === stat ? season.multiplier : 1.0;
}
