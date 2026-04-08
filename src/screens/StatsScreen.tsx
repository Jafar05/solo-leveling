import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import {
  COLORS,
  STAT_COLORS,
  STAT_FULL_LABELS,
  STAT_EMOJIS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
} from '../theme';
import { StatKey, ALL_STAT_KEYS } from '../engine/types';
import { isStatAtRisk, getDaysWithoutActivity, streakMultiplier } from '../engine/xp';

const ALL_STATS: StatKey[] = ALL_STAT_KEYS;

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const StatsScreen: React.FC = () => {
  const { character, getWeeklyXP, actionLogs } = useCharacterStore();
  const weeklyXP = getWeeklyXP();
  const maxXP = Math.max(...weeklyXP.map((d) => d.xp), 1);

  const totalXPAllTime = ALL_STATS.reduce((s, k) => s + character.stats[k].totalXP, 0);
  const totalActions = actionLogs.length;

  // Топ статов по XP за всё время
  const topStats = [...ALL_STATS]
    .sort((a, b) => character.stats[b].totalXP - character.stats[a].totalXP);

  // Максимальный XP среди статов
  const maxStatXP = Math.max(...ALL_STATS.map((k) => character.stats[k].totalXP), 1);

  // Последние действия
  const recentLogs = actionLogs.slice(0, 10);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>АНАЛИТИКА</Text>

        {/* Общая статистика */}
        <View style={styles.overviewGrid}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{totalXPAllTime.toLocaleString()}</Text>
            <Text style={styles.overviewLabel}>Всего XP</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{totalActions}</Text>
            <Text style={styles.overviewLabel}>Действий</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>
              🔥 {character.streakDays}
            </Text>
            <Text style={styles.overviewLabel}>Дней серии</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: COLORS.accent }]}>
              x{streakMultiplier(character.streakDays).toFixed(1)}
            </Text>
            <Text style={styles.overviewLabel}>Мульт XP</Text>
          </View>
        </View>

        {/* График недели */}
        <Text style={styles.sectionTitle}>XP ЗА НЕДЕЛЮ</Text>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {weeklyXP.map((day, i) => {
              const ratio = day.xp / maxXP;
              const dayOfWeek = new Date(day.date).getDay();
              const label = DAY_LABELS[(dayOfWeek + 6) % 7];
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <View key={day.date} style={styles.chartBar}>
                  <Text style={[styles.chartXP, day.xp > 0 && { color: COLORS.accent }]}>
                    {day.xp > 0 ? day.xp : ''}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(4, ratio * 80),
                          backgroundColor: isToday ? COLORS.accent : COLORS.accentPurple + '80',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isToday && { color: COLORS.accent }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.chartTotal}>
            Итого: {weeklyXP.reduce((s, d) => s + d.xp, 0).toLocaleString()} XP за 7 дней
          </Text>
        </View>

        {/* Топ статов */}
        <Text style={styles.sectionTitle}>ПРОКАЧКА СТАТОВ</Text>
        <View style={styles.card}>
          {topStats.map((key, i) => {
            const stat = character.stats[key];
            const ratio = stat.totalXP / maxStatXP;
            const atRisk = isStatAtRisk(stat);
            const days = getDaysWithoutActivity(stat);
            return (
              <View key={key} style={styles.statRow}>
                <Text style={styles.statRank}>#{i + 1}</Text>
                <Text style={styles.statEmoji}>{STAT_EMOJIS[key]}</Text>
                <View style={styles.statInfo}>
                  <View style={styles.statNameRow}>
                    <Text style={[styles.statName, { color: STAT_COLORS[key] }]}>
                      {STAT_FULL_LABELS[key]}
                    </Text>
                    <Text style={styles.statLevelBadge}>Lv.{stat.level}</Text>
                  </View>
                  <View style={styles.statBarBg}>
                    <View
                      style={[
                        styles.statBarFill,
                        { width: `${ratio * 100}%`, backgroundColor: STAT_COLORS[key] },
                      ]}
                    />
                  </View>
                  <Text style={styles.statXPText}>{stat.totalXP.toLocaleString()} XP</Text>
                </View>
                {atRisk && (
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskText}>{days}д</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Предупреждения */}
        {ALL_STATS.some((k) => isStatAtRisk(character.stats[k])) && (
          <>
            <Text style={styles.sectionTitle}>⚠️ ТРЕБУЮТ ВНИМАНИЯ</Text>
            <View style={styles.card}>
              {ALL_STATS.filter((k) => isStatAtRisk(character.stats[k])).map((key) => {
                const days = getDaysWithoutActivity(character.stats[key]);
                return (
                  <View key={key} style={styles.warningRow}>
                    <Text style={styles.warningEmoji}>{STAT_EMOJIS[key]}</Text>
                    <Text style={styles.warningText}>
                      {STAT_FULL_LABELS[key]} — без активности {days} дн.
                    </Text>
                    <Text style={styles.warningBadge}>⚡</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Последние действия */}
        {recentLogs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>ПОСЛЕДНИЕ ДЕЙСТВИЯ</Text>
            <View style={styles.card}>
              {recentLogs.map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={styles.logEmoji}>{STAT_EMOJIS[log.stat]}</Text>
                  <View style={styles.logInfo}>
                    <Text style={styles.logDesc} numberOfLines={1}>{log.description}</Text>
                    <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
                  </View>
                  <Text style={[styles.logXP, { color: STAT_COLORS[log.stat] }]}>
                    +{log.finalXP}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },

  title: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
  },
  overviewLabel: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },

  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginBottom: SPACING.md,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chartXP: {
    fontSize: 8,
    color: COLORS.textDim,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '60%',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
  },
  chartTotal: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  statRank: {
    width: 20,
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  statEmoji: { fontSize: 18 },
  statInfo: { flex: 1, gap: 4 },
  statNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statName: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  statLevelBadge: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.medium,
  },
  statBarBg: {
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 999,
    overflow: 'hidden',
  },
  statBarFill: { height: '100%', borderRadius: 999 },
  statXPText: { fontSize: FONTS.size.xs, color: COLORS.textMuted },
  riskBadge: {
    backgroundColor: '#2A0A0A',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
  },
  riskText: { fontSize: FONTS.size.xs, color: COLORS.danger },

  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  warningEmoji: { fontSize: 18 },
  warningText: { flex: 1, fontSize: FONTS.size.sm, color: COLORS.danger },
  warningBadge: { fontSize: 16 },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  logEmoji: { fontSize: 18 },
  logInfo: { flex: 1 },
  logDesc: { fontSize: FONTS.size.sm, color: COLORS.text },
  logDate: { fontSize: FONTS.size.xs, color: COLORS.textMuted, marginTop: 2 },
  logXP: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
});
