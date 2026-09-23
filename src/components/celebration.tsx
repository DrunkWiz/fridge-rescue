import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { buildAccessory, palette } from '@/components/creature/sprites';
import { PixelGrid } from '@/components/pixel-grid';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { ACCESSORIES } from '@/lib/rules/progress';
import { useGame, useSproutName } from '@/store/game';
import { useItems } from '@/store/items';

const CONFETTI = ['🥕', '🍅', '🥦', '🍋', '🫑', '🍞', '🧀', '✨', '💚', '🌱'];
const TOAST_MS = 5000;

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

/** Everyday feedback: one line, auto-dismisses, with undo for mis-taps. */
function Toast({ text, onUndo, onDone }: { text: string; onUndo?: () => void; onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const t = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(t);
  }, [text, onDone]);
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.toast, { bottom: insets.bottom + 140, backgroundColor: theme.text }]}>
      <ThemedText type="mono" style={[styles.toastText, { color: theme.background }]} numberOfLines={2}>
        {text}
      </ThemedText>
      {onUndo && (
        <Pressable onPress={onUndo} hitSlop={10} accessibilityRole="button">
          <ThemedText type="mono" style={{ color: theme.tint, fontWeight: 700 }}>
            UNDO
          </ThemedText>
        </Pressable>
      )}
    </Animated.View>
  );
}

/**
 * Feedback for whatever just happened (`useGame().moment`): a toast for
 * everyday saves, a confetti card for milestones and purchases.
 */
export function CelebrationOverlay() {
  const theme = useTheme();
  const moment = useGame((s) => s.moment);
  const dismiss = useGame((s) => s.dismissMoment);
  const toggleAccessory = useGame((s) => s.toggleAccessory);
  const equipped = useGame((s) => s.equipped);
  const restore = useItems((s) => s.restore);
  const name = useSproutName();

  if (!moment) return null;

  if (moment.kind === 'toast') {
    const { undo, undoFn } = moment;
    return (
      <Toast
        text={moment.text}
        onDone={dismiss}
        onUndo={
          undo || undoFn
            ? () => {
                if (undo) restore(undo);
                undoFn?.();
                dismiss();
              }
            : undefined
        }
      />
    );
  }

  const win = moment.kind === 'win' ? moment : null;
  const firstReward = win?.newBadges[0]?.reward;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        {/* Tap-outside-to-close sits behind the card, so taps on the card's buttons never reach it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close" />
        <Confetti />
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {moment.kind === 'bought' ? (
            <>
              <PixelGrid grid={buildAccessory(moment.id)} palette={palette('content')} pixel={8} />
              <ThemedText type="mono" style={styles.center}>
                {name} put on the {ACCESSORIES[moment.id].name.toLowerCase()}.
              </ThemedText>
              <Button label="looks good" onPress={dismiss} style={styles.cta} />
            </>
          ) : win ? (
            <>
              <Text style={styles.bigEmoji}>{win.levelUp ? '🌳' : win.newBadges.length ? '🏅' : '🎯'}</Text>
              {win.xpGained > 0 && (
                <ThemedText type="monoLarge" style={{ color: theme.tint }}>
                  +{win.xpGained} xp
                </ThemedText>
              )}
              {win.levelUp && (
                <ThemedText type="mono" style={styles.center}>
                  {name} grew into a{' '}
                  <ThemedText type="mono" style={{ fontWeight: 700 }}>
                    {win.levelUp.name.toLowerCase()}
                  </ThemedText>
                  !
                </ThemedText>
              )}
              {win.newBadges.map((badge) => (
                <View key={badge.id} style={[styles.badge, { borderColor: theme.border }]}>
                  <ThemedText type="mono" style={{ fontWeight: 700 }}>
                    🏅 {badge.title.toLowerCase()}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {badge.description} · unlocked the {ACCESSORIES[badge.reward].name.toLowerCase()}
                  </ThemedText>
                </View>
              ))}
              {win.challenge && (
                <View style={[styles.badge, { borderColor: theme.tint }]}>
                  <ThemedText type="mono" style={{ fontWeight: 700 }}>
                    ✓ weekly challenge: {win.challenge.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    +{win.challenge.reward} 🌱
                  </ThemedText>
                </View>
              )}
              {firstReward && equipped[ACCESSORIES[firstReward].slot] !== firstReward ? (
                <Button
                  label={`put on the ${ACCESSORIES[firstReward].name.toLowerCase()}`}
                  onPress={() => {
                    toggleAccessory(firstReward);
                    dismiss();
                  }}
                  style={styles.cta}
                />
              ) : (
                <Button label="yay!" onPress={dismiss} style={styles.cta} />
              )}
              {win.undo && (
                <Pressable
                  onPress={() => {
                    restore(win.undo!);
                    dismiss();
                  }}
                  hitSlop={8}
                  accessibilityRole="button">
                  <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
                    mis-tap? undo
                  </ThemedText>
                </Pressable>
              )}
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '88%', maxWidth: 360, borderRadius: 8, borderWidth: 2, padding: 24, alignItems: 'center', gap: 10 },
  bigEmoji: { fontSize: 56 },
  center: { textAlign: 'center' },
  tiny: { fontSize: 12, lineHeight: 16 },
  badge: { alignSelf: 'stretch', borderRadius: 6, borderWidth: 1.5, padding: 12, gap: 2 },
  cta: { alignSelf: 'stretch', marginTop: 8 },
  piece: { position: 'absolute', top: 0, fontSize: 26 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastText: { flex: 1 },
});
