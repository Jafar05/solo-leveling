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
} from 'react-native';
import { useJournalStore } from '../store/useJournalStore';
import { useProfileStore } from '../store/useProfileStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../theme';

export const JournalBlockerModal: React.FC = () => {
  const { getTodayEntry, answerTodayQuestion, isTodayAnswered, shouldShowBlocker, ensureTodayQuestion } =
    useJournalStore();
  const { addJournalEntryFromBlocker } = useProfileStore();

  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Проверяем каждые 60 секунд
  useEffect(() => {
    ensureTodayQuestion();
    const check = () => {
      const show = shouldShowBlocker();
      setVisible(show);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Пульсация иконки
  useEffect(() => {
    if (visible && !submitted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, submitted]);

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

  const handleSubmit = () => {
    if (!answer.trim() || answer.trim().length < 10) {
      shake();
      return;
    }
    const todayEntry = getTodayEntry();
    answerTodayQuestion(answer.trim());
    if (todayEntry) {
      addJournalEntryFromBlocker(todayEntry.question, answer.trim());
    }
    setSubmitted(true);
    setTimeout(() => setVisible(false), 1500);
  };

  const entry = getTodayEntry();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}} // нельзя закрыть
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
          {submitted ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>ЗАПИСАНО</Text>
              <Text style={styles.successSub}>Хорошая работа, Охотник</Text>
            </View>
          ) : (
            <>
              <Animated.Text style={[styles.lockEmoji, { transform: [{ scale: pulseAnim }] }]}>
                📔
              </Animated.Text>

              <Text style={styles.title}>ВОПРОС ДНЯ</Text>
              <Text style={styles.subtitle}>Заполни дневник, чтобы продолжить</Text>

              <View style={styles.timeWarning}>
                <Text style={styles.timeWarningText}>🕗 Уже после 20:00 — время подвести итоги дня</Text>
              </View>

              {entry && (
                <View style={styles.questionCard}>
                  <Text style={styles.questionLabel}>ВОПРОС</Text>
                  <Text style={styles.questionText}>{entry.question}</Text>
                </View>
              )}

              <Animated.View style={[styles.inputWrapper, { transform: [{ translateX: shakeAnim }] }]}>
                <TextInput
                  style={styles.input}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Напиши честный ответ (минимум 10 символов)..."
                  placeholderTextColor={COLORS.textDim}
                  multiline
                  maxLength={500}
                  autoFocus
                />
              </Animated.View>

              <Text style={styles.counter}>{answer.length} / 500</Text>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  answer.trim().length < 10 && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>ЗАПИСАТЬ И ПРОДОЛЖИТЬ →</Text>
              </TouchableOpacity>

              <Text style={styles.hint}>
                Это окно нельзя закрыть.{'\n'}Будь честен — это только для тебя.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingVertical: 60,
  },
  lockEmoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
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
  },
  timeWarning: {
    backgroundColor: '#1A1200',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '60',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
    alignSelf: 'stretch',
  },
  timeWarningText: {
    color: COLORS.warning,
    fontSize: FONTS.size.sm,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  questionLabel: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.black,
    color: COLORS.accent,
    letterSpacing: 2,
  },
  questionText: {
    fontSize: FONTS.size.md,
    color: COLORS.text,
    lineHeight: 24,
  },
  inputWrapper: {
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
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
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: SPACING.lg,
  },
  submitButtonDisabled: {
    opacity: 0.35,
  },
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
  // Success state
  successContainer: {
    alignItems: 'center',
    gap: SPACING.lg,
  },
  successEmoji: { fontSize: 72 },
  successTitle: {
    fontSize: 32,
    fontWeight: FONTS.weight.black,
    color: COLORS.success,
    letterSpacing: 4,
  },
  successSub: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
  },
});
