import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLifeProfileStore } from '../store/useLifeProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { extractSphereContexts } from '../engine/profileAI';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../theme';

export const ContextBlockerModal: React.FC = () => {
  const {
    shouldShowContextBlocker,
    getContextQuestion,
    markContextDoneToday,
    setSphereContexts,
    sphereContexts,
  } = useLifeProfileStore();
  const { deepseekApiKey } = useSettingsStore();

  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<'input' | 'processing' | 'done'>('input');
  const [shakeAnim] = useState(new Animated.Value(0));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Проверяем каждые 60 секунд
  useEffect(() => {
    const check = () => setVisible(shouldShowContextBlocker());
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Пульсация иконки
  useEffect(() => {
    if (visible && phase === 'input') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, phase]);

  // Блокируем кнопку «назад» на Android
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (!answer.trim() || answer.trim().length < 10) {
      shake();
      return;
    }

    // Сразу закрываем блокер и помечаем день выполненным
    markContextDoneToday();
    setPhase('processing');

    // AI-извлечение в фоне (не блокирует UI)
    if (deepseekApiKey) {
      try {
        const extracted = await extractSphereContexts(answer.trim(), sphereContexts, deepseekApiKey);
        if (Object.keys(extracted).length > 0) {
          setSphereContexts(extracted);
        }
      } catch {
        // Тихо игнорируем — текст уже сохранён концептуально
      }
    }

    setPhase('done');
    setTimeout(() => setVisible(false), 1500);
  };

  const question = getContextQuestion();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {phase === 'done' ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>⚡</Text>
              <Text style={styles.successTitle}>ЗАПИСАНО</Text>
              <Text style={styles.successSub}>Система анализирует твой контекст</Text>
            </View>
          ) : phase === 'processing' ? (
            <View style={styles.successContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.processingTitle}>АНАЛИЗИРУЮ...</Text>
              <Text style={styles.successSub}>AI строит твой профиль</Text>
            </View>
          ) : (
            <>
              <Animated.Text style={[styles.lockEmoji, { transform: [{ scale: pulseAnim }] }]}>
                🎯
              </Animated.Text>

              <Text style={styles.title}>CHECK-IN</Text>
              <Text style={styles.subtitle}>Расскажи что происходит — AI адаптирует задания под тебя</Text>

              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>ВОПРОС ДНЯ</Text>
                <Text style={styles.questionText}>{question}</Text>
              </View>

              <Animated.View style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}>
                <TextInput
                  style={styles.input}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Пиши честно и конкретно — чем больше деталей, тем точнее советы..."
                  placeholderTextColor={COLORS.textDim}
                  multiline
                  maxLength={1500}
                  autoFocus
                />
              </Animated.View>

              <Text style={styles.counter}>{answer.length} / 1500</Text>

              <TouchableOpacity
                style={[styles.submitButton, answer.trim().length < 10 && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>ЗАПИСАТЬ И ПРОДОЛЖИТЬ →</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                Это окно нельзя закрыть.{'\n'}Твои ответы делают квесты и советы точнее.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingVertical: 60,
  },
  lockEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  title: {
    fontSize: 28,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentPurple + '50',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accentPurple,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  questionLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.black,
    color: COLORS.accentPurple,
    letterSpacing: 2,
  },
  questionText: {
    fontSize: FONTS.size.md,
    color: COLORS.text,
    lineHeight: 24,
  },
  inputWrapper: { alignSelf: 'stretch' },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentPurple + '40',
    padding: SPACING.lg,
    color: COLORS.text,
    fontSize: FONTS.size.md,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  counter: {
    alignSelf: 'flex-end',
    color: COLORS.textDim,
    fontSize: FONTS.size.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  submitButton: {
    backgroundColor: COLORS.accentPurple,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.lg,
  },
  submitButtonDisabled: { opacity: 0.35 },
  submitText: {
    color: COLORS.white,
    fontWeight: FONTS.weight.black,
    fontSize: FONTS.size.md,
    letterSpacing: 1,
  },
  hint: {
    fontSize: FONTS.size.xs,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: { alignItems: 'center', gap: SPACING.lg },
  successEmoji: { fontSize: 72 },
  successTitle: {
    fontSize: 32,
    fontWeight: FONTS.weight.black,
    color: COLORS.success,
    letterSpacing: 4,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: FONTS.weight.black,
    color: COLORS.accent,
    letterSpacing: 3,
    marginTop: SPACING.lg,
  },
  successSub: { fontSize: FONTS.size.md, color: COLORS.textMuted },
});
