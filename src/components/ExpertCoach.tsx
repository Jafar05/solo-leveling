import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLifeProfileStore, SphereContext } from '../store/useLifeProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { generateCoachInsight } from '../engine/profileAI';
import { BehavioralProfile } from '../engine/adaptiveEngine';
import { COLORS, STAT_COLORS, STAT_EMOJIS, FONTS, SPACING, BORDER_RADIUS } from '../theme';
import { todayStr } from '../engine/xp';

interface Props {
  behavioralProfile: BehavioralProfile;
}

export const ExpertCoach: React.FC<Props> = ({ behavioralProfile }) => {
  const { sphereContexts, coachInsight, setCoachInsight, resetInsightViewDate } = useLifeProfileStore();
  const { deepseekApiKey } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeContexts = Object.values(sphereContexts).filter(Boolean) as SphereContext[];
  const hasProfile = activeContexts.length > 0;

  // Совет считается свежим если сгенерирован сегодня
  const insightToday = coachInsight?.generatedAt
    ? new Date(coachInsight.generatedAt).toISOString().slice(0, 10) === todayStr()
    : false;

  const handleGenerate = async () => {
    if (!deepseekApiKey) {
      setError('Добавь API ключ DeepSeek в настройках');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const insight = await generateCoachInsight(sphereContexts, behavioralProfile, deepseekApiKey);
      setCoachInsight(insight);
      resetInsightViewDate(); // Сбрасываем чтобы blocker показал новый совет
    } catch {
      setError('Не удалось получить совет. Проверь подключение.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasProfile) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧠 ЛИЧНЫЙ КОУЧ</Text>
        <Text style={styles.emptyText}>
          Отвечай на утренние вопросы — система изучит твою жизнь и начнёт давать экспертные советы именно под тебя.
        </Text>
      </View>
    );
  }

  const statColor = coachInsight ? STAT_COLORS[coachInsight.stat] : COLORS.accentPurple;
  const statEmoji = coachInsight ? STAT_EMOJIS[coachInsight.stat] : '🧠';

  return (
    <View style={[styles.card, { borderColor: statColor + '40' }]}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>🧠 ЛИЧНЫЙ КОУЧ</Text>
        {!loading && (
          <TouchableOpacity onPress={handleGenerate} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>{insightToday ? '↻' : '+ Совет'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.accentPurple} />
          <Text style={styles.loadingText}>AI подбирает эксперта...</Text>
        </View>
      ) : coachInsight ? (
        <>
          {/* Роль AI */}
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>{coachInsight.role}</Text>
          </View>

          {/* Совет */}
          <View style={[styles.insightBox, { borderLeftColor: statColor }]}>
            <Text style={styles.insightEmoji}>{statEmoji}</Text>
            <Text style={styles.insightText}>{coachInsight.text}</Text>
          </View>

          {!insightToday && (
            <Text style={styles.staleHint}>Совет от предыдущего дня — нажми обновить</Text>
          )}
        </>
      ) : (
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.8}>
          <Text style={styles.generateBtnText}>⚡ ПОЛУЧИТЬ ЭКСПЕРТНЫЙ СОВЕТ</Text>
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentPurple + '30',
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.black,
    color: COLORS.accentPurple,
    letterSpacing: 2,
  },
  refreshBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.accentPurple + '20',
    borderRadius: BORDER_RADIUS.sm,
  },
  refreshText: {
    color: COLORS.accentPurple,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
  },
  emptyText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
  },
  roleTag: {
    backgroundColor: COLORS.accentPurple + '15',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: FONTS.size.xs,
    color: COLORS.accentPurple,
    fontWeight: FONTS.weight.medium,
    fontStyle: 'italic',
  },
  insightBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderLeftWidth: 3,
    paddingLeft: SPACING.md,
  },
  insightEmoji: { fontSize: 18, marginTop: 1 },
  insightText: {
    flex: 1,
    fontSize: FONTS.size.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  staleHint: {
    fontSize: FONTS.size.xs,
    color: COLORS.textDim,
    fontStyle: 'italic',
  },
  generateBtn: {
    backgroundColor: COLORS.accentPurple,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  generateBtnText: {
    color: COLORS.white,
    fontWeight: FONTS.weight.black,
    fontSize: FONTS.size.sm,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: FONTS.size.xs,
    color: COLORS.danger,
  },
});
