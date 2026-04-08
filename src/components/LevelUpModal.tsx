import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LevelUpEvent } from '../engine/types';
import { COLORS, STAT_COLORS, STAT_FULL_LABELS, STAT_EMOJIS, FONTS, SPACING } from '../theme';

const { width, height } = Dimensions.get('window');

interface Props {
  event: LevelUpEvent | null;
  onClose: () => void;
}

export const LevelUpModal: React.FC<Props> = ({ event, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (event) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      glowAnim.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          ]),
          { iterations: 20 }
        ),
      ]).start();
    }
  }, [event]);

  if (!event) return null;

  const statColor = STAT_COLORS[event.stat];
  const statEmoji = STAT_EMOJIS[event.stat];
  const statName = STAT_FULL_LABELS[event.stat];

  return (
    <Modal transparent visible={!!event} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              borderColor: statColor,
            },
          ]}
        >
          {/* Верхняя полоса */}
          <View style={[styles.topBar, { backgroundColor: statColor }]} />

          <Text style={styles.levelUpText}>LEVEL UP!</Text>
          <Text style={styles.statEmoji}>{statEmoji}</Text>

          <View style={[styles.statBadge, { borderColor: statColor }]}>
            <Text style={[styles.statName, { color: statColor }]}>{statName}</Text>
          </View>

          <View style={styles.levelRow}>
            <Text style={styles.oldLevel}>{event.oldLevel}</Text>
            <Text style={styles.arrow}>→</Text>
            <Animated.Text
              style={[
                styles.newLevel,
                { color: statColor, opacity: glowAnim },
              ]}
            >
              {event.newLevel}
            </Animated.Text>
          </View>

          <Text style={styles.xpGained}>+{event.xpGained} XP</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: statColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>ПРОДОЛЖИТЬ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.82,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: SPACING.xl,
  },
  topBar: {
    width: '100%',
    height: 4,
    marginBottom: SPACING.xl,
  },
  levelUpText: {
    fontSize: FONTS.size.xxxl,
    fontWeight: FONTS.weight.black,
    color: COLORS.white,
    letterSpacing: 4,
    marginBottom: SPACING.md,
  },
  statEmoji: {
    fontSize: 60,
    marginBottom: SPACING.md,
  },
  statBadge: {
    borderWidth: 1,
    borderRadius: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  statName: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    letterSpacing: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  oldLevel: {
    fontSize: 44,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textMuted,
  },
  arrow: {
    fontSize: FONTS.size.xxl,
    color: COLORS.textMuted,
  },
  newLevel: {
    fontSize: 56,
    fontWeight: FONTS.weight.black,
  },
  xpGained: {
    fontSize: FONTS.size.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
  },
  button: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.md,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: FONTS.weight.bold,
    fontSize: FONTS.size.md,
    letterSpacing: 2,
  },
});
