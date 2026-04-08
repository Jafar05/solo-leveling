import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { parseActionWithAI, AIActionResult, AIParseResult } from '../engine/ai';
import { StatKey, Difficulty } from '../engine/types';
import { calculateFinalXP } from '../engine/xp';
import {
  COLORS,
  STAT_COLORS,
  STAT_FULL_LABELS,
  STAT_EMOJIS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
} from '../theme';

type Mode = 'ai' | 'manual';

const ALL_STATS: StatKey[] = ['str', 'int', 'cha', 'soc', 'biz', 'vit', 'wil'];
const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

const EXAMPLES = [
  'потренировался час в зале, жал штангу',
  'подошёл к девушке в кафе, познакомился, взял номер',
  'прочитал 40 страниц книги по психологии',
  'провёл переговоры и закрыл сделку',
  'встал в 6 утра и принял холодный душ',
  'написал код 2 часа, решил сложный баг',
];

export const LogScreen: React.FC = () => {
  const { character, logAction, getTodayStats } = useCharacterStore();
  const { deepseekApiKey, setApiKey } = useSettingsStore();

  const [mode, setMode] = useState<Mode>('ai');
  const [input, setInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(deepseekApiKey);
  const [showApiKeyForm, setShowApiKeyForm] = useState(!deepseekApiKey);

  // AI состояние
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIParseResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [clarificationInput, setClarificationInput] = useState('');

  // Manual состояние
  const [manualStat, setManualStat] = useState<StatKey>('str');
  const [manualDifficulty, setManualDifficulty] = useState<Difficulty>('normal');
  const [manualDuration, setManualDuration] = useState(30);
  const [manualDesc, setManualDesc] = useState('');

  // Анимация
  const successOpacity = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastXP, setLastXP] = useState(0);

  const todayStats = getTodayStats();
  const statsHitToday = todayStats?.statsHit ?? [];

  // ── AI режим ────────────────────────────────────────────────────────────────

  const handleAIAnalyze = async () => {
    if (!input.trim()) return;
    if (!deepseekApiKey) {
      setShowApiKeyForm(true);
      return;
    }

    setIsLoading(true);
    setAiResult(null);
    setAiError('');

    try {
      const result = await parseActionWithAI(input.trim(), deepseekApiKey, character.stats);
      setAiResult(result);
    } catch (e: any) {
      setAiError(e?.message ?? 'Ошибка AI. Проверь API ключ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIConfirm = () => {
    if (!aiResult) return;

    let totalXP = 0;

    aiResult.actions.forEach((action) => {
      const { finalXP } = calculateFinalXP(
        action.stat,
        action.durationMinutes,
        action.difficulty,
        character.streakDays,
        statsHitToday,
        character.stats[action.stat].level
      );
      totalXP += finalXP + action.xpBonus;

      logAction({
        description: action.description,
        stat: action.stat,
        difficulty: action.difficulty,
        durationMinutes: action.durationMinutes,
      });

      if (action.xpBonus > 0) {
        logAction({
          description: `[Milestone] ${action.milestones.join(', ')}`,
          stat: action.stat,
          difficulty: 'hard',
          durationMinutes: 5,
        });
      }
    });

    showSuccessAnim(totalXP);
    setInput('');
    setAiResult(null);
    setClarificationInput('');
  };

  // ── Manual режим ────────────────────────────────────────────────────────────

  const handleManualSubmit = () => {
    if (!manualDesc.trim()) return;
    const { finalXP } = calculateFinalXP(
      manualStat,
      manualDuration,
      manualDifficulty,
      character.streakDays,
      statsHitToday,
      character.stats[manualStat].level
    );

    logAction({
      description: manualDesc.trim(),
      stat: manualStat,
      difficulty: manualDifficulty,
      durationMinutes: manualDuration,
    });

    showSuccessAnim(finalXP);
    setManualDesc('');
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const showSuccessAnim = (xp: number) => {
    setLastXP(xp);
    setShowSuccess(true);
    successOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(successOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowSuccess(false));
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setShowApiKeyForm(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>ЗАПИСАТЬ ДЕЙСТВИЕ</Text>

          {/* Переключатель режимов */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'ai' && styles.modeTabActive]}
              onPress={() => setMode('ai')}
            >
              <Text style={[styles.modeTabText, mode === 'ai' && styles.modeTabTextActive]}>
                🤖 AI Режим
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]}
              onPress={() => setMode('manual')}
            >
              <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>
                ✏️ Вручную
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── AI РЕЖИМ ── */}
          {mode === 'ai' && (
            <>
              {/* API Key форма */}
              {showApiKeyForm ? (
                <View style={styles.apiKeyCard}>
                  <Text style={styles.apiKeyTitle}>🔑 DeepSeek API ключ</Text>
                  <Text style={styles.apiKeyHint}>
                    Получи ключ на platform.deepseek.com → API Keys
                  </Text>
                  <TextInput
                    style={styles.apiKeyInput}
                    value={apiKeyInput}
                    onChangeText={setApiKeyInput}
                    placeholder="sk-..."
                    placeholderTextColor={COLORS.textDim}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.saveKeyButton, !apiKeyInput.trim() && { opacity: 0.4 }]}
                    onPress={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    <Text style={styles.saveKeyText}>СОХРАНИТЬ</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.changeKeyButton}
                  onPress={() => setShowApiKeyForm(true)}
                >
                  <Text style={styles.changeKeyText}>🔑 Изменить API ключ</Text>
                </TouchableOpacity>
              )}

              {/* Поле ввода */}
              <Text style={styles.label}>Опиши что ты сделал:</Text>
              <TextInput
                style={styles.aiInput}
                value={input}
                onChangeText={(t) => { setInput(t); setAiResult(null); setAiError(''); }}
                placeholder="Напиши в свободной форме..."
                placeholderTextColor={COLORS.textDim}
                multiline
                maxLength={300}
              />

              {/* Примеры */}
              {!input && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examplesScroll}>
                  {EXAMPLES.map((ex, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.exampleChip}
                      onPress={() => setInput(ex)}
                    >
                      <Text style={styles.exampleText}>{ex}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Кнопка анализа */}
              {!aiResult && (
                <TouchableOpacity
                  style={[styles.analyzeButton, (!input.trim() || isLoading) && { opacity: 0.4 }]}
                  onPress={handleAIAnalyze}
                  disabled={!input.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.analyzeButtonText}>🤖 АНАЛИЗИРОВАТЬ</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Ошибка */}
              {!!aiError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {aiError}</Text>
                </View>
              )}

              {/* Уточняющий вопрос */}
              {aiResult?.needsClarification && (
                <View style={styles.clarificationBox}>
                  <Text style={styles.clarificationQ}>🤔 {aiResult.clarificationQuestion}</Text>
                  <TextInput
                    style={styles.clarificationInput}
                    value={clarificationInput}
                    onChangeText={setClarificationInput}
                    placeholder="Уточни..."
                    placeholderTextColor={COLORS.textDim}
                  />
                  <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={() => {
                      setInput(`${input}. ${clarificationInput}`);
                      setAiResult(null);
                      setClarificationInput('');
                      handleAIAnalyze();
                    }}
                  >
                    <Text style={styles.analyzeButtonText}>УТОЧНИТЬ</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Результат AI — список действий */}
              {aiResult && !aiResult.needsClarification && (
                <View style={styles.aiResultCard}>
                  {aiResult.actions.map((action, idx) => {
                    const { finalXP } = calculateFinalXP(
                      action.stat,
                      action.durationMinutes,
                      action.difficulty,
                      character.streakDays,
                      statsHitToday,
                      character.stats[action.stat].level
                    );
                    const totalActionXP = finalXP + action.xpBonus;
                    const diffLabel = action.difficulty === 'hard' ? '🔥 Сложно' : action.difficulty === 'easy' ? '😊 Легко' : '⚡ Норм';

                    return (
                      <View key={idx} style={[styles.actionBlock, idx > 0 && styles.actionBlockBorder]}>
                        <View style={styles.aiResultHeader}>
                          <View style={[styles.statBadge, { backgroundColor: STAT_COLORS[action.stat] + '25', borderColor: STAT_COLORS[action.stat] }]}>
                            <Text style={styles.statBadgeEmoji}>{STAT_EMOJIS[action.stat]}</Text>
                            <Text style={[styles.statBadgeLabel, { color: STAT_COLORS[action.stat] }]}>
                              {STAT_FULL_LABELS[action.stat]}
                            </Text>
                          </View>
                          <View style={styles.aiMetaRight}>
                            <Text style={styles.aiMetaText}>{diffLabel}</Text>
                            <Text style={styles.aiMetaText}>⏱ {action.durationMinutes} мин</Text>
                          </View>
                        </View>

                        <Text style={styles.aiDesc}>{action.description}</Text>

                        {action.milestones.length > 0 && (
                          <View style={styles.milestonesBox}>
                            {action.milestones.map((m, i) => (
                              <View key={i} style={styles.milestoneBadge}>
                                <Text style={styles.milestoneText}>🏆 {m} +{action.xpBonus} XP</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {!!action.levelPenaltyNote && (
                          <Text style={styles.penaltyNote}>📉 {action.levelPenaltyNote}</Text>
                        )}

                        <View style={styles.xpRow}>
                          <Text style={styles.xpLabel}>
                            {aiResult.actions.length > 1 ? `ДЕЙСТВИЕ ${idx + 1}` : 'ИТОГО XP'}
                          </Text>
                          <Text style={[styles.xpValue, { color: STAT_COLORS[action.stat] }]}>
                            +{totalActionXP} XP
                          </Text>
                        </View>

                        {!!action.coachNote && (
                          <View style={styles.coachNote}>
                            <Text style={styles.coachNoteText}>💬 {action.coachNote}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Итог если несколько действий */}
                  {aiResult.actions.length > 1 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>ВСЕГО XP:</Text>
                      <Text style={styles.totalValue}>
                        +{aiResult.actions.reduce((sum, a) => {
                          const { finalXP } = calculateFinalXP(a.stat, a.durationMinutes, a.difficulty, character.streakDays, statsHitToday, character.stats[a.stat].level);
                          return sum + finalXP + a.xpBonus;
                        }, 0)} XP
                      </Text>
                    </View>
                  )}

                  <View style={styles.resultButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => { setAiResult(null); }}
                    >
                      <Text style={styles.rejectText}>Переписать</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: COLORS.accent }]}
                      onPress={handleAIConfirm}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.confirmText}>ПОЛУЧИТЬ XP ✓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ── MANUAL РЕЖИМ ── */}
          {mode === 'manual' && (
            <>
              <Text style={styles.label}>Описание:</Text>
              <TextInput
                style={styles.input}
                value={manualDesc}
                onChangeText={setManualDesc}
                placeholder="Что ты сделал?"
                placeholderTextColor={COLORS.textDim}
                multiline
              />

              <Text style={styles.label}>Категория:</Text>
              <View style={styles.statsRow}>
                {ALL_STATS.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.statChip, manualStat === key && { backgroundColor: STAT_COLORS[key], borderColor: STAT_COLORS[key] }]}
                    onPress={() => setManualStat(key)}
                  >
                    <Text style={styles.statChipEmoji}>{STAT_EMOJIS[key]}</Text>
                    <Text style={[styles.statChipLabel, manualStat === key && { color: COLORS.white }]}>
                      {STAT_FULL_LABELS[key].split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Сложность:</Text>
              <View style={styles.diffRow}>
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
                  const labels = { easy: 'Лёгко', normal: 'Норм', hard: 'Сложно' };
                  const colors = { easy: COLORS.success, normal: COLORS.accent, hard: COLORS.danger };
                  const active = d === manualDifficulty;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.diffChip, active && { backgroundColor: colors[d], borderColor: colors[d] }]}
                      onPress={() => setManualDifficulty(d)}
                    >
                      <Text style={[styles.diffLabel, active && { color: COLORS.white }]}>{labels[d]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Длительность:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DURATION_OPTIONS.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[styles.durationChip, manualDuration === min && styles.durationChipActive]}
                    onPress={() => setManualDuration(min)}
                  >
                    <Text style={[styles.durationLabel, manualDuration === min && { color: COLORS.white }]}>
                      {min < 60 ? `${min}м` : `${min / 60}ч`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.analyzeButton, !manualDesc.trim() && { opacity: 0.4 }]}
                onPress={handleManualSubmit}
                disabled={!manualDesc.trim()}
              >
                <Text style={styles.analyzeButtonText}>ПОЛУЧИТЬ XP</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast успеха */}
      {showSuccess && (
        <Animated.View style={[styles.successToast, { opacity: successOpacity }]}>
          <Text style={styles.successText}>+{lastXP} XP получено! 🔥</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 120 },

  title: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: SPACING.lg,
  },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  modeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: COLORS.accent },
  modeTabText: { fontSize: FONTS.size.sm, color: COLORS.textMuted, fontWeight: FONTS.weight.medium },
  modeTabTextActive: { color: COLORS.white, fontWeight: FONTS.weight.bold },

  label: {
    fontSize: FONTS.size.sm,
    color: COLORS.textMuted,
    fontWeight: FONTS.weight.bold,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },

  // API Key
  apiKeyCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  apiKeyTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, color: COLORS.text },
  apiKeyHint: { fontSize: FONTS.size.sm, color: COLORS.textMuted },
  apiKeyInput: {
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.size.sm,
  },
  saveKeyButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  saveKeyText: { color: COLORS.white, fontWeight: FONTS.weight.bold, letterSpacing: 1 },
  changeKeyButton: { alignSelf: 'flex-end', marginBottom: SPACING.sm },
  changeKeyText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },

  // AI Input
  aiInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.size.md,
    minHeight: 90,
    textAlignVertical: 'top',
  },

  examplesScroll: { marginTop: SPACING.sm },
  exampleChip: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    maxWidth: 220,
  },
  exampleText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },

  analyzeButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: COLORS.white,
    fontWeight: FONTS.weight.black,
    fontSize: FONTS.size.md,
    letterSpacing: 2,
  },

  errorBox: {
    marginTop: SPACING.md,
    backgroundColor: '#1A0A0A',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
    padding: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: FONTS.size.sm },

  // AI Result
  aiResultCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  aiResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  statBadgeEmoji: { fontSize: 16 },
  statBadgeLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  aiMetaRight: { gap: 4, alignItems: 'flex-end' },
  aiMetaText: { fontSize: FONTS.size.sm, color: COLORS.textMuted },

  aiDesc: {
    fontSize: FONTS.size.md,
    color: COLORS.text,
    lineHeight: 22,
  },

  milestonesBox: { gap: SPACING.xs },
  milestoneBadge: {
    backgroundColor: '#1A1200',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
  },
  milestoneText: { fontSize: FONTS.size.sm, color: '#F59E0B', fontWeight: FONTS.weight.bold },

  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  xpLabel: { fontSize: FONTS.size.sm, color: COLORS.textMuted, fontWeight: FONTS.weight.bold, letterSpacing: 1 },
  xpBonus: { fontSize: FONTS.size.xs, color: '#F59E0B', marginTop: 2 },
  xpValue: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.black },

  coachNote: {
    backgroundColor: '#0A0A15',
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: SPACING.md,
  },
  coachNoteText: { fontSize: FONTS.size.sm, color: COLORS.textMuted, lineHeight: 20 },

  resultButtons: { flexDirection: 'row', gap: SPACING.sm },
  rejectButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  rejectText: { color: COLORS.textMuted, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  confirmButton: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  confirmText: { color: COLORS.white, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.black, letterSpacing: 1 },

  // Manual
  input: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.size.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  statChipEmoji: { fontSize: 14 },
  statChipLabel: { fontSize: FONTS.size.sm, color: COLORS.textMuted, fontWeight: FONTS.weight.medium },
  diffRow: { flexDirection: 'row', gap: SPACING.sm },
  diffChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  diffLabel: { fontSize: FONTS.size.md, color: COLORS.textMuted, fontWeight: FONTS.weight.bold },
  durationChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: SPACING.sm,
  },
  durationChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  durationLabel: { fontSize: FONTS.size.md, color: COLORS.textMuted, fontWeight: FONTS.weight.medium },

  clarificationBox: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  clarificationQ: { fontSize: FONTS.size.md, color: COLORS.text, lineHeight: 22 },
  clarificationInput: {
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONTS.size.md,
  },
  actionBlock: { gap: SPACING.md },
  actionBlockBorder: {
    paddingTop: SPACING.lg,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  penaltyNote: {
    fontSize: FONTS.size.xs,
    color: COLORS.warning,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  totalLabel: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.black,
    color: COLORS.accent,
  },
  successToast: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  successText: { color: COLORS.white, fontSize: FONTS.size.lg, fontWeight: FONTS.weight.black },
});
