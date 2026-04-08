import { StatKey } from '../engine/types';

export interface Quest {
  id: string;
  title: string;
  description: string;
  stat: StatKey;
  type: 'daily' | 'story' | 'boss';
  targetStat?: StatKey;
  targetLevel?: number; // Требуемый уровень для разблокировки
  xpReward: number;
  emoji: string;
  completedAt?: number | null;
}

export const DAILY_QUESTS: Quest[] = [
  { id: 'd_str', title: 'Тренировка дня', description: 'Позанимайся физически хотя бы 30 минут', stat: 'str', type: 'daily', xpReward: 25, emoji: '⚔️' },
  { id: 'd_int', title: 'Читатель', description: 'Прочитай минимум 20 страниц', stat: 'int', type: 'daily', xpReward: 20, emoji: '📚' },
  { id: 'd_cha', title: 'Социальный контакт', description: 'Заговори с кем-то новым', stat: 'cha', type: 'daily', xpReward: 20, emoji: '💬' },
  { id: 'd_vit', title: 'Здоровый день', description: 'Здоровое питание и 8 часов сна', stat: 'vit', type: 'daily', xpReward: 20, emoji: '🌿' },
  { id: 'd_wil', title: 'Дисциплина', description: 'Встань до 7 утра или сделай холодный душ', stat: 'wil', type: 'daily', xpReward: 25, emoji: '🔥' },
  { id: 'd_biz', title: 'Рабочий блок', description: 'Работай в фокусе 2+ часов', stat: 'biz', type: 'daily', xpReward: 30, emoji: '💼' },
  { id: 'd_soc', title: 'Социальная активность', description: 'Напиши или познакомься с кем-то интересным', stat: 'soc', type: 'daily', xpReward: 25, emoji: '❤️' },
];

export const STORY_QUESTS: Quest[] = [
  {
    id: 's_first_approach',
    title: 'Первый шаг',
    description: 'Подойди и заговори с незнакомой девушкой на улице',
    stat: 'soc',
    type: 'story',
    xpReward: 200,
    emoji: '🌹',
  },
  {
    id: 's_first_speech',
    title: 'Голос Лидера',
    description: 'Выступи перед аудиторией 10+ человек',
    stat: 'cha',
    type: 'story',
    targetStat: 'cha',
    targetLevel: 5,
    xpReward: 500,
    emoji: '🎤',
  },
  {
    id: 's_first_deal',
    title: 'Первая сделка',
    description: 'Заработай деньги вне основной работы',
    stat: 'biz',
    type: 'story',
    targetStat: 'biz',
    targetLevel: 5,
    xpReward: 500,
    emoji: '💰',
  },
  {
    id: 's_book_10',
    title: 'Библиотека разума',
    description: 'Прочитай 10 книг',
    stat: 'int',
    type: 'story',
    xpReward: 300,
    emoji: '🧠',
  },
  {
    id: 's_streak_30',
    title: 'Железная воля',
    description: '30 дней подряд без пропуска',
    stat: 'wil',
    type: 'story',
    xpReward: 1000,
    emoji: '🏆',
  },
];

export const BOSS_QUESTS: Quest[] = [
  {
    id: 'b_marathon',
    title: 'БОСС: Марафон',
    description: 'Пробеги полный марафон (42 км)',
    stat: 'str',
    type: 'boss',
    targetStat: 'str',
    targetLevel: 15,
    xpReward: 2000,
    emoji: '🏅',
  },
  {
    id: 'b_product',
    title: 'БОСС: Запуск продукта',
    description: 'Запусти свой продукт или сервис',
    stat: 'biz',
    type: 'boss',
    targetStat: 'biz',
    targetLevel: 20,
    xpReward: 3000,
    emoji: '🚀',
  },
  {
    id: 'b_100_approaches',
    title: 'БОСС: Легенда улиц',
    description: '100 знакомств с новыми людьми',
    stat: 'soc',
    type: 'boss',
    xpReward: 5000,
    emoji: '👑',
  },
];
