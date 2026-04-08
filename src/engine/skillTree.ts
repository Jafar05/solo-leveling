import { SkillNode, StatKey } from './types';

export const SKILL_TREE: SkillNode[] = [
  // ─── Сила ──────────────────────────────────────────────────────────────────
  { id: 'str_1', stat: 'str', name: 'Адаптация тела',   emoji: '💪', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Силе за регулярные тренировки' },
  { id: 'str_2', stat: 'str', name: 'Выносливость',     emoji: '🏃', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['str_1'], description: '+10% XP к Силе. Тело привыкло к нагрузкам' },
  { id: 'str_3', stat: 'str', name: 'Атлет',            emoji: '🏆', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['str_2'], description: '+15% XP к Силе. Профессиональный уровень' },

  // ─── Интеллект ────────────────────────────────────────────────────────────
  { id: 'int_1', stat: 'int', name: 'Острый ум',        emoji: '🧠', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Интеллекту' },
  { id: 'int_2', stat: 'int', name: 'Глубокий фокус',   emoji: '🔬', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['int_1'], description: '+10% XP к Интеллекту. Умение концентрироваться' },
  { id: 'int_3', stat: 'int', name: 'Полимат',          emoji: '📖', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['int_2'], description: '+15% XP к Интеллекту. Знания в разных областях' },

  // ─── Харизма ──────────────────────────────────────────────────────────────
  { id: 'cha_1', stat: 'cha', name: 'Магнетизм',        emoji: '✨', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Харизме' },
  { id: 'cha_2', stat: 'cha', name: 'Сила присутствия', emoji: '🎭', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['cha_1'], description: '+10% XP к Харизме' },
  { id: 'cha_3', stat: 'cha', name: 'Лидер',            emoji: '🦁', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['cha_2'], description: '+15% XP к Харизме. Люди тянутся к тебе' },

  // ─── Социальная жизнь ─────────────────────────────────────────────────────
  { id: 'soc_1', stat: 'soc', name: 'Открытость',       emoji: '😊', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Соц. жизни' },
  { id: 'soc_2', stat: 'soc', name: 'Уверенность',      emoji: '💘', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['soc_1'], description: '+10% XP к Соц. жизни' },
  { id: 'soc_3', stat: 'soc', name: 'Притяжение',       emoji: '❤️‍🔥', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['soc_2'], description: '+15% XP к Соц. жизни. Притягиваешь людей' },

  // ─── Бизнес ───────────────────────────────────────────────────────────────
  { id: 'biz_1', stat: 'biz', name: 'Рабочий режим',    emoji: '💼', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Бизнесу' },
  { id: 'biz_2', stat: 'biz', name: 'Переговорщик',     emoji: '🤝', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['biz_1'], description: '+10% XP к Бизнесу' },
  { id: 'biz_3', stat: 'biz', name: 'Визионер',         emoji: '🏰', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['biz_2'], description: '+15% XP к Бизнесу. Видишь возможности везде' },

  // ─── Здоровье ─────────────────────────────────────────────────────────────
  { id: 'vit_1', stat: 'vit', name: 'Режим дня',        emoji: '🌿', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Здоровью' },
  { id: 'vit_2', stat: 'vit', name: 'Биохакинг',        emoji: '⚗️', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['vit_1'], description: '+10% XP к Здоровью. Оптимизация организма' },
  { id: 'vit_3', stat: 'vit', name: 'Долголетие',       emoji: '🧬', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['vit_2'], description: '+15% XP к Здоровью' },

  // ─── Воля ─────────────────────────────────────────────────────────────────
  { id: 'wil_1', stat: 'wil', name: 'Самоконтроль',     emoji: '🔥', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Воле' },
  { id: 'wil_2', stat: 'wil', name: 'Антихрупкость',    emoji: '🛡️', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['wil_1'], description: '+10% XP к Воле. Трудности тебя закаляют' },
  { id: 'wil_3', stat: 'wil', name: 'Несломленный',     emoji: '⚡', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['wil_2'], description: '+15% XP к Воле' },

  // ─── Стиль ────────────────────────────────────────────────────────────────
  { id: 'sty_1', stat: 'sty', name: 'Вкус',             emoji: '👗', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Стилю' },
  { id: 'sty_2', stat: 'sty', name: 'Имидж',            emoji: '🪞', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['sty_1'], description: '+10% XP к Стилю. Ты создаёшь образ осознанно' },
  { id: 'sty_3', stat: 'sty', name: 'Икона',            emoji: '👑', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['sty_2'], description: '+15% XP к Стилю' },

  // ─── Карма ────────────────────────────────────────────────────────────────
  { id: 'kar_1', stat: 'kar', name: 'Добросердечие',    emoji: '🌟', unlockLevel: 5,  passiveBonus: 0.05, dependencies: [],       description: '+5% XP к Карме' },
  { id: 'kar_2', stat: 'kar', name: 'Альтруизм',        emoji: '🤲', unlockLevel: 15, passiveBonus: 0.10, dependencies: ['kar_1'], description: '+10% XP к Карме. Отдача становится природой' },
  { id: 'kar_3', stat: 'kar', name: 'Святой',           emoji: '😇', unlockLevel: 25, passiveBonus: 0.15, dependencies: ['kar_2'], description: '+15% XP к Карме' },

  // ─── Кросс-статовые (требуют нескольких статов) ────────────────────────
  { id: 'cross_1', stat: 'wil', name: 'Гармония',       emoji: '☯️', unlockLevel: 10, passiveBonus: 0.05, dependencies: ['str_1', 'vit_1'], description: '+5% XP ко всем статам. Баланс сила и здоровье' },
  { id: 'cross_2', stat: 'cha', name: 'Победитель',     emoji: '🎖️', unlockLevel: 20, passiveBonus: 0.10, dependencies: ['biz_2', 'soc_2'], description: '+10% XP к Харизме. Успех везде' },
];

export function getUnlockedSkills(
  statLevels: Record<StatKey, number>,
  unlockedSkillIds: string[]
): SkillNode[] {
  return SKILL_TREE.filter((skill) => {
    if (unlockedSkillIds.includes(skill.id)) return false;
    // Нужен уровень
    if (statLevels[skill.stat] < skill.unlockLevel) return false;
    // Нужны зависимости
    return skill.dependencies.every((dep) => unlockedSkillIds.includes(dep));
  });
}

export function getSkillPassiveBonus(stat: StatKey, unlockedSkillIds: string[]): number {
  return SKILL_TREE
    .filter((s) => s.stat === stat && unlockedSkillIds.includes(s.id))
    .reduce((sum, s) => sum + s.passiveBonus, 0);
}
