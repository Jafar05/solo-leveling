import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import { RadarChart } from '../components/RadarChart';
import { StatBar } from '../components/StatBar';
import { LevelUpModal } from '../components/LevelUpModal';
import { AdaptiveInsights } from '../components/AdaptiveInsights';
import { ExpertCoach } from '../components/ExpertCoach';
import { buildBehavioralProfile } from '../engine/adaptiveEngine';
import {
  characterLevel,
  getRank,
  getRankTitle,
  xpNeededForLevel,
  isStatAtRisk,
} from '../engine/xp';
import {
  COLORS,
  STAT_COLORS,
  STAT_FULL_LABELS,
  STAT_EMOJIS,
  RANK_COLORS,
  FONTS,
  SPACING,
} from '../theme';
import { StatKey, ALL_STAT_KEYS } from '../engine/types';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '../store/useProfileStore';
import { ALL_TITLES } from '../engine/titles';
import { getCurrentSeason } from '../engine/seasons';

const ALL_STATS: StatKey[] = ALL_STAT_KEYS;

export const HeroScreen: React.FC = () => {
  const { character, actionLogs, dailyStats, pendingLevelUp, clearLevelUp, applyDecay } = useCharacterStore();

  const adaptiveProfile = useMemo(
    () => buildBehavioralProfile(actionLogs, character.stats, dailyStats),
    [actionLogs, character.stats, dailyStats]
  );
  const { activeTitleId, checkAndUnlockTitles } = useProfileStore();
  const navigation = useNavigation<any>();
  const season = getCurrentSeason();

  useEffect(() => {
    applyDecay();
    checkAndUnlockTitles(character);
  }, []);

  const charLevel = characterLevel(character.stats);
  const rank = getRank(charLevel);
  const rankTitle = getRankTitle(rank);
  const rankColor = RANK_COLORS[rank];

  // XP до следующего уровня персонажа
  const totalStatXP = ALL_STATS.reduce((s, k) => s + character.stats[k].totalXP, 0);
  const nextLevelXP = xpNeededForLevel(charLevel) * ALL_STATS.length;
  const currentProgress = ALL_STATS.reduce((s, k) => s + character.stats[k].currentXP, 0);
  const progressRatio = Math.min(1, currentProgress / nextLevelXP);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка */}
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{character.name.toUpperCase()}</Text>
            <Text style={styles.class}>{rankTitle}</Text>
          </View>
          <View style={[styles.rankBadge, { borderColor: rankColor }]}>
            <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
            <Text style={[styles.rankStars, { color: rankColor }]}>
              {'★'.repeat(Math.min(5, Math.ceil(charLevel / 10)))}
            </Text>
          </View>
        </View>

        {/* Активный титул */}
        {activeTitleId && (() => {
          const title = ALL_TITLES.find((t) => t.id === activeTitleId);
          return title ? (
            <View style={styles.titleBadge}>
              <Text style={styles.titleEmoji}>{title.emoji}</Text>
              <Text style={styles.titleName}>{title.name}</Text>
            </View>
          ) : null;
        })()}

        {/* Баннер сезона */}
        <View style={styles.seasonBanner}>
          <Text style={styles.seasonEmoji}>{season.emoji}</Text>
          <View style={styles.seasonInfo}>
            <Text style={styles.seasonName}>{season.name}</Text>
            <Text style={styles.seasonDesc}>+30% XP к {season.bonusStat.toUpperCase()} весь месяц</Text>
          </View>
        </View>

        {/* Уровень */}
        <View style={styles.levelContainer}>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>Уровень</Text>
            <Text style={[styles.levelNumber, { color: rankColor }]}>{charLevel}</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${progressRatio * 100}%`, backgroundColor: rankColor },
              ]}
            />
          </View>
          <Text style={styles.xpHint}>
            {currentProgress.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
          </Text>
        </View>

        {/* Паутина статов */}
        <View style={styles.radarContainer}>
          <RadarChart stats={character.stats} size={220} />
        </View>

        {/* Streak */}
        {character.streakDays > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakText}>🔥 Серия: {character.streakDays} дней</Text>
            <Text style={styles.streakMult}>
              +{Math.round((getStreakMult(character.streakDays) - 1) * 100)}% к XP
            </Text>
          </View>
        )}

        {/* Личный коуч */}
        <ExpertCoach behavioralProfile={adaptiveProfile} />

        {/* Адаптивный анализ */}
        <AdaptiveInsights profile={adaptiveProfile} />

        {/* Статы */}
        <Text style={styles.sectionTitle}>ХАРАКТЕРИСТИКИ</Text>
        <View style={styles.statsGrid}>
          {ALL_STATS.map((key) => {
            const stat = character.stats[key];
            const atRisk = isStatAtRisk(stat);
            return (
              <View key={key} style={[styles.statCard, atRisk && styles.statCardAtRisk]}>
                <View style={styles.statCardHeader}>
                  <Text style={styles.statEmoji}>{STAT_EMOJIS[key]}</Text>
                  <Text style={[styles.statLabel, { color: STAT_COLORS[key] }]}>
                    {STAT_FULL_LABELS[key]}
                  </Text>
                  <Text style={styles.statLevel}>Lv.{stat.level}</Text>
                </View>
                <StatBar
                  statKey={key}
                  level={stat.level}
                  currentXP={stat.currentXP}
                  compact
                />
                {atRisk && (
                  <Text style={styles.decayWarning}>⚠️ Деградация скоро</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Кнопка лога */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => navigation.navigate('Log')}
          activeOpacity={0.8}
        >
          <Text style={styles.logButtonText}>+ ЗАПИСАТЬ ДЕЙСТВИЕ</Text>
        </TouchableOpacity>
      </ScrollView>

      <LevelUpModal event={pendingLevelUp} onClose={clearLevelUp} />
    </SafeAreaView>
  );
};

function getStreakMult(days: number): number {
  if (days >= 60) return 2.5;
  if (days >= 30) return 2.0;
  if (days >= 14) return 1.5;
  if (days >= 7) return 1.25;
  if (days >= 3) return 1.1;
  return 1.0;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  name: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 2,
  },
  class: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  rankBadge: {
    borderWidth: 2,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  rankText: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.black,
    letterSpacing: 2,
  },
  rankStars: {
    fontSize: FONTS.size.xs,
    letterSpacing: 1,
  },

  levelContainer: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelLabel: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.medium,
  },
  levelNumber: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.black,
  },
  xpBarBg: {
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 999,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  xpHint: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },

  radarContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },

  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1008',
    borderRadius: SPACING.md,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold,
  },
  streakMult: {
    color: '#F59E0B',
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
  },

  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },

  statsGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statCardAtRisk: {
    borderColor: '#EF444440',
    backgroundColor: '#150A0A',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statEmoji: { fontSize: 16 },
  statLabel: {
    flex: 1,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    letterSpacing: 1,
  },
  statLevel: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.medium,
  },
  decayWarning: {
    fontSize: FONTS.size.xs,
    color: COLORS.danger,
  },

  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1A1025',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8B5CF640',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  titleEmoji: { fontSize: 14 },
  titleName: {
    fontSize: FONTS.size.sm,
    color: COLORS.accentPurple,
    fontWeight: FONTS.weight.bold,
  },

  seasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1220',
    borderRadius: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.accent}30`,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  seasonEmoji: { fontSize: 28 },
  seasonInfo: { flex: 1 },
  seasonName: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.accent,
    marginBottom: 2,
  },
  seasonDesc: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
  },

  logButton: {
    backgroundColor: COLORS.accent,
    borderRadius: SPACING.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.black,
    letterSpacing: 2,
  },
});
