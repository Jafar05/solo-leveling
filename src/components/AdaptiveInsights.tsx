import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BehavioralProfile } from '../engine/adaptiveEngine';
import { StatKey } from '../engine/types';
import { COLORS, STAT_COLORS, STAT_EMOJIS, STAT_FULL_LABELS, FONTS, SPACING, BORDER_RADIUS } from '../theme';

interface Props {
  profile: BehavioralProfile;
}

function StatTag({
  stat,
  color,
  label,
}: {
  stat: StatKey;
  color: string;
  label?: string;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '18', borderColor: color + '50' }]}>
      <Text style={styles.tagEmoji}>{STAT_EMOJIS[stat]}</Text>
      <Text style={[styles.tagText, { color }]}>
        {STAT_FULL_LABELS[stat]}
        {label ? ` · ${label}` : ''}
      </Text>
    </View>
  );
}

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBarWrap}>
        <View style={styles.scoreBarBg}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${Math.max(2, value)}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={[styles.scoreValue, { color }]}>{value}%</Text>
      </View>
    </View>
  );
}

export const AdaptiveInsights: React.FC<Props> = ({ profile }) => {
  const hasData = profile.totalActionsLast30 > 0;

  if (!hasData) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧠 АДАПТИВНЫЙ АНАЛИЗ</Text>
        <Text style={styles.emptyText}>
          Залогируй несколько действий — система начнёт анализировать твои паттерны и адаптировать задания под тебя.
        </Text>
      </View>
    );
  }

  const diffHardPercent = profile.difficultyBreakdown.hard;
  const isCoasting = diffHardPercent < 15;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🧠 АДАПТИВНЫЙ АНАЛИЗ</Text>

      {/* Фокус — куда направить усилия */}
      {profile.focusSuggestion.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>АКЦЕНТ СЕЙЧАС</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {profile.focusSuggestion.map((stat) => (
                <StatTag key={stat} stat={stat} color={STAT_COLORS[stat]} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Запущено */}
      {profile.neglectedStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚠️ ЗАПУЩЕНО (7+ ДНЕЙ)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {profile.neglectedStats.map((stat) => {
                const b = profile.statBehaviors.find((s) => s.stat === stat)!;
                return (
                  <StatTag
                    key={stat}
                    stat={stat}
                    color={COLORS.danger}
                    label={`${b.daysWithoutActivity}д`}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Никогда не трогал */}
      {profile.virginStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔒 НЕ НАЧАТО</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {profile.virginStats.map((stat) => (
                <StatTag key={stat} stat={stat} color={COLORS.textDim} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Зона комфорта */}
      {profile.comfortZoneStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>😴 ЗОНА КОМФОРТА (ТОЛЬКО EASY)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {profile.comfortZoneStats.map((stat) => (
                <StatTag key={stat} stat={stat} color={COLORS.warning} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Горячие */}
      {profile.hotStreakStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔥 ГОРЯЧИЙ СТРИК</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {profile.hotStreakStats.map((stat) => (
                <StatTag key={stat} stat={stat} color={COLORS.success} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Метрики */}
      <View style={styles.metricsSection}>
        <ScoreBar
          value={profile.consistencyScore}
          color={profile.consistencyScore >= 70 ? COLORS.success : profile.consistencyScore >= 40 ? COLORS.warning : COLORS.danger}
          label={`Стабильность (${profile.activeDaysLast14}/14 дней)`}
        />
        <ScoreBar
          value={profile.balanceScore}
          color={profile.balanceScore >= 60 ? COLORS.success : profile.balanceScore >= 35 ? COLORS.warning : COLORS.danger}
          label="Баланс развития"
        />
        <ScoreBar
          value={diffHardPercent}
          color={diffHardPercent >= 30 ? COLORS.success : diffHardPercent >= 15 ? COLORS.warning : COLORS.danger}
          label="Доля сложных задач"
        />
      </View>

      {/* Вывод */}
      {isCoasting && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚡ Только {diffHardPercent}% задач на «Сложно». Ты застрял в зоне комфорта — AI будет давить сильнее.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.black,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  emptyText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  section: { gap: SPACING.xs },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textDim,
    letterSpacing: 1,
  },
  tagsRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'nowrap' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  tagEmoji: { fontSize: 13 },
  tagText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold },

  metricsSection: { gap: SPACING.sm, marginTop: SPACING.xs },
  scoreRow: { gap: SPACING.xs },
  scoreLabel: { fontSize: 10, color: COLORS.textDim, fontWeight: FONTS.weight.medium },
  scoreBarWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  scoreBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 99,
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 99 },
  scoreValue: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold, minWidth: 32, textAlign: 'right' },

  warningBox: {
    backgroundColor: COLORS.accent + '10',
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  warningText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 19,
  },
});
