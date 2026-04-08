import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, STAT_COLORS, FONTS, SPACING } from '../theme';
import { StatKey } from '../engine/types';
import { xpNeededForLevel } from '../engine/xp';

interface Props {
  statKey: StatKey;
  level: number;
  currentXP: number;
  color?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export const StatBar: React.FC<Props> = ({
  statKey,
  level,
  currentXP,
  color,
  showLabel = true,
  compact = false,
}) => {
  const statColor = color ?? STAT_COLORS[statKey];
  const needed = xpNeededForLevel(level);
  const progress = Math.min(1, needed > 0 ? currentXP / needed : 0);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: statColor }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.row}>
          <Text style={styles.label}>{level} LVL</Text>
          <Text style={[styles.xpText, { color: statColor }]}>
            {currentXP} / {needed} XP
          </Text>
        </View>
      )}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${progress * 100}%`, backgroundColor: statColor },
          ]}
        />
        <View style={[styles.barGlow, { width: `${progress * 100}%`, backgroundColor: statColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: SPACING.xs },
  compactContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.bold,
  },
  xpText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
  },
  barBg: {
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 999,
    opacity: 0.4,
    // shadowColor set dynamically
  },
});
