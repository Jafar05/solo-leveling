import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import { useQuestStore, QuestType, CompletedQuestRecord } from '../store/useQuestStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { buildBehavioralProfile } from '../engine/adaptiveEngine';
import { GeneratedQuest } from '../engine/questAI';
import {
  scheduleQuestReminders,
  cancelQuestReminders,
} from '../engine/notifications';
import {
  COLORS,
  STAT_COLORS,
  STAT_EMOJIS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
} from '../theme';

type Tab = 'daily' | 'story' | 'boss' | 'history';

function isQuestExpired(quest: GeneratedQuest): boolean {
  if (!quest.expiresAt) return false;
  return Date.now() > quest.expiresAt;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} с`;
  return `${s} с`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Живой таймер ─────────────────────────────────────────────────────────────

function QuestTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000));

  useEffect(() => {
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    );
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={styles.timerText}>⏱ {formatElapsed(elapsed)}</Text>;
}

// ─── Карточка истории ──────────────────────────────────────────────────────────

function HistoryCard({ record }: { record: CompletedQuestRecord }) {
  const statColor = STAT_COLORS[record.stat];

  return (
    <View style={[styles.questCard, styles.historyCard, styles.historyCardSpacing, { borderLeftColor: statColor }]}>
      <View style={styles.questHeader}>
        <Text style={styles.questEmoji}>{record.emoji}</Text>
        <View style={styles.questInfo}>
          <Text style={[styles.questTitle, styles.questTitleDone]}>{record.title}</Text>
          {!!record.description && (
            <Text style={styles.questDescription}>{record.description}</Text>
          )}
        </View>
      </View>
      <View style={styles.questFooter}>
        <Text style={[styles.questXP, { color: statColor }]}>+{record.xpReward} XP</Text>
        <View style={styles.historyMeta}>
          {record.durationSeconds !== null && (
            <Text style={styles.historyDuration}>⏱ {formatDuration(record.durationSeconds)}</Text>
          )}
          <Text style={styles.questComplete}>✅ Выполнено</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Основной экран ────────────────────────────────────────────────────────────

export const QuestsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [historyTab, setHistoryTab] = useState<QuestType>('daily');

  const { character, actionLogs, dailyStats, completeQuest: charCompleteQuest } = useCharacterStore();
  const { deepseekApiKey } = useSettingsStore();

  const adaptiveProfile = useMemo(
    () => buildBehavioralProfile(actionLogs, character.stats, dailyStats),
    [actionLogs, character.stats, dailyStats]
  );

  const {
    dailyQuests,
    storyQuests,
    bossQuests,
    questHistory,
    isGenerating,
    generateError,
    checkAndApplyDayRollover,
    refreshUncompletedQuests,
    generateStoryQuests,
    generateBossQuests,
    startQuest,
    setQuestNotificationIds,
    completeQuest,
    completePunishment,
    isQuestCompleted,
    isQuestStarted,
    getQuestStartedAt,
    getActivePunishments,
    getHistoryByType,
    questNotificationIds,
  } = useQuestStore();

  const activePunishments = getActivePunishments();

  useEffect(() => {
    if (deepseekApiKey) {
      checkAndApplyDayRollover(character.stats, deepseekApiKey, adaptiveProfile);
    }
  }, []);

  useEffect(() => {
    if (!deepseekApiKey) return;
    if (storyQuests.length === 0) generateStoryQuests(character.stats, deepseekApiKey, adaptiveProfile);
    if (bossQuests.length === 0) generateBossQuests(character.stats, deepseekApiKey, adaptiveProfile);
  }, []);

  const handleGenerate = async () => {
    if (!deepseekApiKey) return;
    if (activeTab === 'daily') await refreshUncompletedQuests(character.stats, deepseekApiKey, adaptiveProfile);
    if (activeTab === 'story') await generateStoryQuests(character.stats, deepseekApiKey, adaptiveProfile);
    if (activeTab === 'boss') await generateBossQuests(character.stats, deepseekApiKey, adaptiveProfile);
  };

  const handleStart = async (quest: GeneratedQuest, questType: QuestType) => {
    startQuest(quest.id);
    const ids = await scheduleQuestReminders(quest.id, quest.title, questType === 'daily');
    if (ids.length > 0) setQuestNotificationIds(quest.id, ids);
  };

  const handleComplete = async (quest: GeneratedQuest, questType: QuestType) => {
    if (isQuestCompleted(quest.id)) return;

    // Отменяем запланированные уведомления для этого квеста
    const notifIds = questNotificationIds[quest.id];
    if (notifIds?.length) await cancelQuestReminders(notifIds);

    completeQuest(quest.id, {
      title: quest.title,
      description: quest.description,
      emoji: quest.emoji,
      stat: quest.stat,
      xpReward: quest.xpReward,
      questType,
    });
    charCompleteQuest(quest.id, quest.stat, quest.xpReward);
  };

  const isUnlocked = (quest: GeneratedQuest): boolean => {
    if (!quest.requiredStat || !quest.requiredLevel) return true;
    return character.stats[quest.requiredStat].level >= quest.requiredLevel;
  };

  const currentQuests: GeneratedQuest[] = activeTab === 'history'
    ? []
    : { daily: dailyQuests, story: storyQuests, boss: bossQuests }[activeTab as QuestType];

  const activeQuests = currentQuests.filter((q) => !isQuestExpired(q));
  const completedToday = activeQuests.filter((q) => isQuestCompleted(q.id)).length;

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'daily', label: 'Ежедневные', emoji: '🔥' },
    { key: 'story', label: 'Сюжетные', emoji: '📖' },
    { key: 'boss', label: 'Боссы', emoji: '💀' },
    { key: 'history', label: 'История', emoji: '📜' },
  ];

  const historySubTabs: { key: QuestType; label: string }[] = [
    { key: 'daily', label: '🔥 Ежедневные' },
    { key: 'story', label: '📖 Сюжетные' },
    { key: 'boss', label: '💀 Боссы' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab !== 'history' ? (
            <RefreshControl
              refreshing={isGenerating}
              onRefresh={handleGenerate}
              tintColor={COLORS.accent}
            />
          ) : undefined
        }
      >
        <Text style={styles.title}>ЗАДАНИЯ</Text>

        {/* Активные задания-наказания */}
        {activePunishments.length > 0 && (
          <View style={styles.punishmentsSection}>
            <Text style={styles.punishmentsHeader}>⚔️ ДОЛГ ЗА НЕВЫПОЛНЕННЫЕ ЗАДАНИЯ</Text>
            {activePunishments.map((task) => (
              <View key={task.id} style={styles.punishmentCard}>
                <View style={styles.punishmentTop}>
                  <Text style={styles.punishmentEmoji}>{task.emoji}</Text>
                  <View style={styles.punishmentInfo}>
                    <Text style={styles.punishmentTitle}>{task.title}</Text>
                    <Text style={styles.punishmentMissed}>Пропущено: {task.missedCount} из 7 заданий</Text>
                  </View>
                </View>
                <Text style={styles.punishmentDesc}>{task.description}</Text>
                <TouchableOpacity
                  style={styles.punishmentDoneButton}
                  onPress={() => completePunishment(task.date)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.punishmentDoneText}>✓ ВЫПОЛНЕНО</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Нет ключа */}
        {!deepseekApiKey && activeTab !== 'history' && (
          <View style={styles.noKeyBanner}>
            <Text style={styles.noKeyText}>
              🔑 Добавь DeepSeek API ключ во вкладке + чтобы AI генерировал персональные квесты
            </Text>
          </View>
        )}

        {/* Прогресс дня для daily */}
        {activeTab === 'daily' && activeQuests.length > 0 && (
          <View style={styles.dailyProgress}>
            <View style={styles.dailyProgressHeader}>
              <Text style={styles.dailyProgressTitle}>🔥 Сегодня</Text>
              <Text style={styles.dailyProgressCount}>
                {completedToday} / {activeQuests.length}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${activeQuests.length > 0 ? (completedToday / activeQuests.length) * 100 : 0}%` },
                ]}
              />
            </View>
            {completedToday === activeQuests.length && activeQuests.length > 0 && (
              <Text style={styles.perfectDay}>✨ Идеальный день! Все задания выполнены</Text>
            )}
          </View>
        )}

        {/* Табы */}
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.emoji} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Вкладка История ─────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <View>
            {/* Под-табы категорий */}
            <View style={styles.historySubTabs}>
              {historySubTabs.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.historySubTab, historyTab === t.key && styles.historySubTabActive]}
                  onPress={() => setHistoryTab(t.key)}
                >
                  <Text style={[styles.historySubTabLabel, historyTab === t.key && styles.historySubTabLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(() => {
              const records = getHistoryByType(historyTab);
              if (records.length === 0) {
                return (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyEmoji}>📜</Text>
                    <Text style={styles.emptyTitle}>История пуста</Text>
                    <Text style={styles.emptySubtitle}>Выполненные квесты будут появляться здесь</Text>
                  </View>
                );
              }

              // Группировка по дате
              const groups: { dateLabel: string; items: typeof records }[] = [];
              for (const record of records) {
                const dateLabel = record.completedAt
                  ? new Date(record.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Дата неизвестна';
                const last = groups[groups.length - 1];
                if (last && last.dateLabel === dateLabel) {
                  last.items.push(record);
                } else {
                  groups.push({ dateLabel, items: [record] });
                }
              }

              return (
                <View style={styles.questsList}>
                  {groups.map((group) => (
                    <View key={group.dateLabel}>
                      <Text style={styles.historyDateHeader}>{group.dateLabel}</Text>
                      {group.items.map((record) => (
                        <HistoryCard key={record.id} record={record} />
                      ))}
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {/* ─── Вкладки квестов ─────────────────────────────────────────── */}
        {activeTab !== 'history' && (
          <>
            {/* Ошибка */}
            {!!generateError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {generateError}</Text>
              </View>
            )}

            {/* Загрузка */}
            {isGenerating && activeQuests.length === 0 && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={COLORS.accent} size="large" />
                <Text style={styles.loadingText}>AI генерирует персональные квесты...</Text>
              </View>
            )}

            {/* Пусто */}
            {!isGenerating && activeQuests.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>
                  {activeTab === 'daily' ? '🌅' : activeTab === 'story' ? '📖' : '💀'}
                </Text>
                <Text style={styles.emptyTitle}>Квестов нет</Text>
                <Text style={styles.emptySubtitle}>
                  {deepseekApiKey
                    ? 'Потяни вниз чтобы AI сгенерировал новые'
                    : 'Добавь API ключ во вкладке +'}
                </Text>
                {deepseekApiKey && (
                  <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                    <Text style={styles.generateButtonText}>🤖 СГЕНЕРИРОВАТЬ</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Список квестов */}
            <View style={styles.questsList}>
              {activeQuests.map((quest) => {
                const questType = activeTab as QuestType;
                const done = isQuestCompleted(quest.id);
                const started = isQuestStarted(quest.id);
                const startedAt = getQuestStartedAt(quest.id);
                const unlocked = isUnlocked(quest);
                const statColor = STAT_COLORS[quest.stat];
                const diffColor =
                  quest.difficulty === 'hard'
                    ? COLORS.danger
                    : quest.difficulty === 'easy'
                    ? COLORS.success
                    : COLORS.accent;

                // Длительность из истории (если уже выполнен)
                const historyRecord = questHistory.find((r) => r.questId === quest.id);

                return (
                  <View
                    key={quest.id}
                    style={[
                      styles.questCard,
                      done && styles.questDone,
                      !unlocked && styles.questLocked,
                      { borderLeftColor: done ? COLORS.success : unlocked ? statColor : COLORS.textDim },
                    ]}
                  >
                    <View style={styles.questHeader}>
                      <Text style={styles.questEmoji}>{quest.emoji}</Text>
                      <View style={styles.questInfo}>
                        <Text style={[styles.questTitle, done && styles.questTitleDone]}>
                          {quest.title}
                        </Text>
                        <Text style={styles.questDesc}>{quest.description}</Text>
                      </View>
                    </View>

                    {/* Живой таймер (если квест запущен и не выполнен) */}
                    {started && !done && startedAt !== null && (
                      <QuestTimer startedAt={startedAt} />
                    )}

                    {/* Время выполнения (если квест завершён и есть данные) */}
                    {done && historyRecord?.durationSeconds !== undefined && historyRecord.durationSeconds !== null && (
                      <Text style={styles.completedDuration}>
                        ⏱ {formatDuration(historyRecord.durationSeconds)}
                      </Text>
                    )}

                    <View style={styles.questMeta}>
                      <View style={[styles.statPill, { borderColor: statColor + '60' }]}>
                        <Text style={styles.statPillText}>{STAT_EMOJIS[quest.stat]}</Text>
                      </View>
                      <View style={[styles.diffPill, { borderColor: diffColor + '60' }]}>
                        <Text style={[styles.diffPillText, { color: diffColor }]}>
                          {quest.difficulty === 'hard' ? '🔥 Сложно' : quest.difficulty === 'easy' ? '😊 Легко' : '⚡ Норм'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.questFooter}>
                      <Text style={[styles.questXP, { color: statColor }]}>+{quest.xpReward} XP</Text>
                      {!unlocked ? (
                        <Text style={styles.questLock}>
                          🔒 {quest.requiredStat?.toUpperCase()} Lv.{quest.requiredLevel}
                        </Text>
                      ) : done ? (
                        <Text style={styles.questComplete}>✅ Выполнено</Text>
                      ) : started ? (
                        <TouchableOpacity
                          style={[styles.questButton, { backgroundColor: COLORS.success }]}
                          onPress={() => handleComplete(quest, questType)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.questButtonText}>✓ ВЫПОЛНИЛ</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.questButton, { backgroundColor: statColor }]}
                          onPress={() => handleStart(quest, questType)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.questButtonText}>▶ НАЧАТЬ</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Кнопка генерации ещё */}
            {activeQuests.length > 0 && deepseekApiKey && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color={COLORS.accent} />
                ) : (
                  <Text style={styles.moreButtonText}>
                    {activeTab === 'daily' ? '🔄 Обновить задания' : '➕ Ещё квесты'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
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

  punishmentsSection: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  punishmentsHeader: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.black,
    color: COLORS.danger,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  punishmentCard: {
    backgroundColor: '#150505',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  punishmentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  punishmentEmoji: { fontSize: 32 },
  punishmentInfo: { flex: 1, gap: 4 },
  punishmentTitle: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.black,
    color: COLORS.danger,
  },
  punishmentMissed: {
    fontSize: FONTS.size.xs,
    color: COLORS.textMuted,
  },
  punishmentDesc: {
    fontSize: FONTS.size.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  punishmentDoneButton: {
    backgroundColor: COLORS.danger + '20',
    borderWidth: 1,
    borderColor: COLORS.danger + '60',
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  punishmentDoneText: {
    color: COLORS.danger,
    fontWeight: FONTS.weight.black,
    fontSize: FONTS.size.sm,
    letterSpacing: 2,
  },
  noKeyBanner: {
    backgroundColor: '#1A1200',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  noKeyText: { fontSize: FONTS.size.sm, color: '#F59E0B', lineHeight: 20 },

  dailyProgress: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.sm,
  },
  dailyProgressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dailyProgressTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: '#F59E0B' },
  dailyProgressCount: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  progressBarBg: { height: 6, backgroundColor: COLORS.cardBorder, borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 999 },
  perfectDay: { fontSize: FONTS.size.sm, color: COLORS.success, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  tab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.accent },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.weight.medium, textAlign: 'center' },
  tabLabelActive: { color: COLORS.white, fontWeight: FONTS.weight.bold },

  historySubTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  historySubTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  historySubTabActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '20',
  },
  historySubTabLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: FONTS.weight.medium },
  historySubTabLabelActive: { color: COLORS.accent, fontWeight: FONTS.weight.bold },

  errorBox: {
    backgroundColor: '#1A0A0A',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: FONTS.size.sm },

  loadingBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.lg,
  },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.size.sm },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold, color: COLORS.text },
  emptySubtitle: { fontSize: FONTS.size.sm, color: COLORS.textMuted, textAlign: 'center' },
  generateButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  generateButtonText: { color: COLORS.white, fontWeight: FONTS.weight.bold, letterSpacing: 1 },

  questsList: { gap: SPACING.md },
  historyDateHeader: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  questCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderLeftWidth: 3,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  questDone: { backgroundColor: '#0A150A', borderColor: '#10B98120' },
  historyCard: { backgroundColor: '#0A100A', borderColor: '#10B98115' },
  historyCardSpacing: { marginBottom: SPACING.sm },
  questLocked: { opacity: 0.5 },
  questHeader: { flexDirection: 'row', gap: SPACING.md },
  questEmoji: { fontSize: 28 },
  questInfo: { flex: 1, gap: 4 },
  questTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.text },
  questTitleDone: { color: COLORS.textMuted },
  questDescription: { fontSize: FONTS.size.sm, color: COLORS.textMuted, marginTop: 2 },
  questDesc: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 18 },

  timerText: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.black,
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: SPACING.xs,
  },
  completedDuration: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  questMeta: { flexDirection: 'row', gap: SPACING.sm },
  statPill: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statPillText: { fontSize: 12 },
  diffPill: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  diffPillText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.medium },

  questFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questXP: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.black },
  questLock: { fontSize: FONTS.size.sm, color: COLORS.textDim },
  questComplete: { fontSize: FONTS.size.sm, color: COLORS.success, fontWeight: FONTS.weight.medium },
  questButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  questButtonText: { color: COLORS.white, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.black, letterSpacing: 1 },

  historyMeta: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  historyDuration: { fontSize: FONTS.size.sm, color: COLORS.textMuted },

  moreButton: {
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  moreButtonText: { color: COLORS.accent, fontWeight: FONTS.weight.bold, fontSize: FONTS.size.sm },
});
