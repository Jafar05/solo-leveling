import { StatKey } from '../engine/types';

export const COLORS = {
  bg: '#0A0A0F',
  card: '#12121A',
  cardBorder: '#1E1E2E',
  accent: '#4F6EF7',
  accentPurple: '#8B5CF6',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  text: '#E2E8F0',
  textMuted: '#64748B',
  textDim: '#334155',
  white: '#FFFFFF',

  // Ранги
  rankE: '#94A3B8',
  rankD: '#22C55E',
  rankC: '#3B82F6',
  rankB: '#A855F7',
  rankA: '#F59E0B',
  rankS: '#EF4444',
};

export const STAT_COLORS: Record<StatKey, string> = {
  str: '#EF4444',
  int: '#3B82F6',
  cha: '#F59E0B',
  soc: '#EC4899',
  biz: '#10B981',
  vit: '#06B6D4',
  wil: '#8B5CF6',
  sty: '#D946EF',
  kar: '#F97316',
};

export const STAT_LABELS: Record<StatKey, string> = {
  str: 'СИЛА',
  int: 'ИНТЕЛ',
  cha: 'ХАРИЗ',
  soc: 'СОЦЖ',
  biz: 'БИЗНЕС',
  vit: 'ЖИЗНЬ',
  wil: 'ВОЛЯ',
  sty: 'СТИЛЬ',
  kar: 'КАРМА',
};

export const STAT_FULL_LABELS: Record<StatKey, string> = {
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

export const STAT_EMOJIS: Record<StatKey, string> = {
  str: '⚔️',
  int: '📚',
  cha: '💬',
  soc: '❤️',
  biz: '💼',
  vit: '🌿',
  wil: '🔥',
  sty: '👑',
  kar: '🌟',
};

export const RANK_COLORS = {
  E: COLORS.rankE,
  D: COLORS.rankD,
  C: COLORS.rankC,
  B: COLORS.rankB,
  A: COLORS.rankA,
  S: COLORS.rankS,
};

export const FONTS = {
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 40,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};
