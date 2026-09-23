import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { buildAccessory, palette } from '@/components/creature/sprites';
import { PixelGrid } from '@/components/pixel-grid';
import { ACCESSORIES } from '@/lib/rules/progress';
import { useGame } from '@/store/game';

const CONFETTI = ['🥕', '🍅', '🥦', '🍋', '🫑', '🍞', '🧀', '✨', '💚', '🌱'];

function Piece({ emoji, x, delay, height }: { emoji: string; x: number; delay: number; height: number }) {
  const y = useSharedValue(-40);
  const spin = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(height + 40, { duration: 1800 + Math.random() * 900, easing: Easing.in(Easing.quad) }));
    spin.value = withDelay(delay, withTiming((Math.random() - 0.5) * 720, { duration: 2400 }));
  }, [delay, height, spin, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${spin.value}deg` }] }));
  return <Animated.Text style={[styles.piece, { left: x }, style]}>{emoji}</Animated.Text>;
}

function Confetti() {
  const { width, height } = useWindowDimensions();
  // Scattered with a fixed pattern (render must stay pure); the fall itself is randomised.
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        key: i,
        emoji: CONFETTI[i % CONFETTI.length],
        x: (((i * 37) % 100) / 100) * (width - 30),
        delay: (i * 53) % 500,
      })),
    [width],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Piece key={p.key} emoji={p.emoji} x={p.x} delay={p.delay} height={height} />
      ))}
    </View>
  );
}

/**
 * The reward moment after an action: XP, growth, badges — or, after binning
 * food, a gentle nudge. Driven by `useGame().moment`.
 */
export function CelebrationOverlay() {
  const theme = useTheme();
  const moment = useGame((s) => s.moment);
  const dismiss = useGame((s) => s.dismissMoment);
  const toggleAccessory = useGame((s) => s.toggleAccessory);
  const equipped = useGame((s) => s.equipped);

  if (!moment) return null;

  const win = moment.kind === 'win' ? moment : null;
  const firstReward = win?.newBadges[0]?.reward;
  const small = moment.kind === 'check-in' || moment.kind === 'bought';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        {(win || moment.kind === 'bought') && <Confetti />}
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }, small && styles.smallCard]}>
          {moment.kind === 'check-in' ? (
            <>
              <Text style={styles.bigEmoji}>⭐</Text>
              <ThemedText type="mono" style={styles.center}>
                fridge checked. +{moment.seeds} 🌱
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                rescue something today to turn it into a 🌟
              </ThemedText>
              <Button label="ok" onPress={dismiss} style={styles.cta} />
            </>
          ) : moment.kind === 'bought' ? (
            <>
              <PixelGrid grid={buildAccessory(moment.id)} palette={palette('content')} pixel={8} />
              <ThemedText type="mono" style={styles.center}>
                sprout put on the {ACCESSORIES[moment.id].name.toLowerCase()}.
              </ThemedText>
              <Button label="looks good" onPress={dismiss} style={styles.cta} />
            </>
          ) : win ? (
            <>
              <Text style={styles.bigEmoji}>{win.levelUp ? '🌳' : win.newBadges.length ? '🏅' : '💚'}</Text>
              {win.xpGained > 0 && (
                <ThemedText type="monoLarge" style={{ color: theme.tint }}>
                  +{win.xpGained} xp
                </ThemedText>
              )}
              {win.levelUp && (
                <ThemedText style={styles.center}>
                  Sprout grew into a <ThemedText type="smallBold">{win.levelUp.name}</ThemedText>!
                </ThemedText>
              )}
              {win.newBadges.map((badge) => (
                <View key={badge.id} style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">🏅 {badge.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {badge.description} · unlocked {ACCESSORIES[badge.reward].emoji} {ACCESSORIES[badge.reward].name}
                  </ThemedText>
                </View>
              ))}
              {!win.levelUp && win.newBadges.length === 0 && (
                <ThemedText style={styles.center}>Nice save. Sprout loved that.</ThemedText>
              )}
              {firstReward && equipped[ACCESSORIES[firstReward].slot] !== firstReward ? (
                <Button
                  label={`Put on the ${ACCESSORIES[firstReward].name.toLowerCase()}`}
                  onPress={() => {
                    toggleAccessory(firstReward);
                    dismiss();
                  }}
                  style={styles.cta}
                />
              ) : (
                <Button label="Yay!" onPress={dismiss} style={styles.cta} />
              )}
            </>
          ) : (
            <>
              <Text style={styles.bigEmoji}>🥀</Text>
              <ThemedText type="smallBold" style={styles.center}>
                It happens.
              </ThemedText>
              <ThemedText style={styles.center}>
                {moment.kind === 'waste' && moment.streakLost > 1
                  ? `That ends a ${moment.streakLost}-day waste-free streak. `
                  : ''}
                Sprout will perk up with your next rescue.
              </ThemedText>
              <Button label="Got it" variant="outline" onPress={dismiss} style={styles.cta} />
            </>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 8, borderWidth: 2, padding: 24, alignItems: 'center', gap: 10 },
  smallCard: { maxWidth: 300 },
  bigEmoji: { fontSize: 56 },
  center: { textAlign: 'center' },
  badge: { alignSelf: 'stretch', borderRadius: 14, padding: 12, gap: 2 },
  cta: { alignSelf: 'stretch', marginTop: 8 },
  piece: { position: 'absolute', top: 0, fontSize: 26 },
});
