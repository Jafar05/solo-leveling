import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Animated,
  ScrollView,
} from 'react-native';
import { useLifeProfileStore } from '../store/useLifeProfileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { STAT_COLORS, STAT_EMOJIS, FONTS, SPACING, BORDER_RADIUS } from '../theme';

export const InsightBlockerModal: React.FC = () => {
  const { coachInsight, lastInsightViewDate, markInsightViewed, shouldShowInsightBlocker } = useLifeProfileStore();
  const { deepseekApiKey } = useSettingsStore();

  const [visible, setVisible] = useState(false);
  const [readSeconds, setReadSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Проверяем каждые 30 секунд
  useEffect(() => {
    const check = () => {
      if (shouldShowInsightBlocker()) {
        setVisible(true);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [shouldShowInsightBlocker]);

  // Таймер чтения
  useEffect(() => {
    if (visible) {
      setReadSeconds(0);
      timerRef.current = setInterval(() => {
        setReadSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  // Пульсация иконки
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible]);

  // Блокируем кнопку «назад» на Android
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  const handleGotIt = () => {
    markInsightViewed();
    setVisible(false);
  };

  if (!visible || !coachInsight) return null;

  // Если нет API ключа — показываем заглушку
  if (!deepseekApiKey) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={() => {}}>
        <View style={styles.container}>
          <View style={styles.inner}>
            <Text style={styles.noApiKeyTitle}>⚡ ЭКСПЕРТНЫЙ СОВЕТ</Text>
            <Text style={styles.noApiKeyText}>
              Для получения персональных рекомендации от AI укажи API ключ DeepSeek в настройках.
            </Text>
            <TouchableOpacity style={styles.gotItBtn} onPress={handleGotIt}>
              <Text style={styles.gotItBtnText}>ПОНЯЛ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const statColor = STAT_COLORS[coachInsight.stat] || COLORS.accentPurple;
  const statEmoji = STAT_EMOJIS[coachInsight.stat] || '🧠';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={() => {}}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <Animated.Text style={[styles.emoji, { transform: [{ scale: pulseAnim }] }]}>
            {statEmoji}
          </Animated.Text>

          <Text style={styles.title}>СОВЕТ НА СЕГОДНЯ</Text>

          <View style={[styles.roleTag, { backgroundColor: statColor + '20' }]}>
            <Text style={[styles.roleText, { color: statColor }]}>{coachInsight.role}</Text>
          </View>

          <View style={[styles.insightCard, { borderLeftColor: statColor }]}>
            <Text style={styles.insightText}>{coachInsight.text}</Text>
          </View>

          <Text style={styles.readTimer}>
            {readSeconds < 5 ? 'Прочитай внимательно...' : `Время чтения: ${readSeconds} сек`}
          </Text>

          <TouchableOpacity
            style={[styles.gotItBtn, { backgroundColor: statColor }]}
            onPress={handleGotIt}
            activeOpacity={0.85}
          >
            <Text style={styles.gotItBtnText}>
              {readSeconds < 3 ? 'ПРОЧИТАЙ СОВЕТ' : 'ПОНЯЛ, ПРИМЕНЮ ✓'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Этот совет сгенерирован на основе твоего контекста.{'\n'}
            Постарайся применить его сегодня.
          </Text>
        </View>
      </ScrollView>
    </Modal>
  );
};

const COLORS = {
  accentPurple: '#8B5CF6',
  card: '#1E1E2E',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  textDim: '#64748B',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    paddingVertical: 50,
    gap: SPACING.lg,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 26,
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: 3,
    textAlign: 'center',
  },
  roleTag: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
    fontStyle: 'italic',
  },
  insightCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING.lg,
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  insightText: {
    fontSize: FONTS.size.md,
    color: COLORS.text,
    lineHeight: 24,
  },
  readTimer: {
    fontSize: FONTS.size.xs,
    color: COLORS.textDim,
    fontStyle: 'italic',
  },
  gotItBtn: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: SPACING.md,
  },
  gotItBtnText: {
    color: '#FFFFFF',
    fontWeight: FONTS.weight.black,
    fontSize: FONTS.size.md,
    letterSpacing: 1.5,
  },
  hint: {
    fontSize: FONTS.size.xs,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
  noApiKeyTitle: {
    fontSize: 24,
    fontWeight: FONTS.weight.black,
    color: COLORS.accentPurple,
    letterSpacing: 2,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  noApiKeyText: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
});
