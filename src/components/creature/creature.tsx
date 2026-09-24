import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PixelGrid } from '@/components/pixel-grid';
import type { CreatureMood } from '@/lib/rules/creature';
import type { AccessoryId, Slot } from '@/lib/rules/progress';

import {
  BACKDROPS,
  buildPal,
  buildSprout,
  HEIGHT,
  PAL_ORIGIN,
  palette,
  SCENE_HEIGHT,
  SCENE_LEFT,
  SCENE_TOP,
  SCENE_WIDTH,
  WIDTH,
} from './sprites';

/**
 * Sprout as pixel art (see sprites.ts). One static sprite per mood, cross-faded
 * with a small pop on change, gentle idle breathing, and a jump when tapped.
 * Growth level scales the pixel size in whole pixels so the art stays crisp.
 */
const pixelForLevel = (level: number, size: 'large' | 'small') =>
  size === 'small' ? 4 : [6, 7, 7, 8, 8, 9][Math.min(Math.max(level, 1), 6) - 1];

type Props = {
  mood: CreatureMood;
  level?: number;
  equipped?: Partial<Record<Slot, AccessoryId>>;
  onPress?: () => void;
  size?: 'large' | 'small';
};

export function Creature({ mood, level = 1, equipped = {}, onPress, size = 'large' }: Props) {
  const scale = useSharedValue(1);
  const jump = useSharedValue(0);
  const breathe = useSharedValue(1);

  // Pals and backdrops are drawn around Sprout, not on it.
  // A full outfit covers hats, face and neck items; floating items still show.
  const { pal, backdrop, outfit, float, ...worn } = equipped;
  const accessories = (outfit ? [outfit, float] : [...Object.values(worn), float]).filter(Boolean) as AccessoryId[];
  const key = accessories.join(',');
  const backdropGrid = useMemo(() => (backdrop ? (BACKDROPS[backdrop]?.() ?? null) : null), [backdrop]);
  const palGrid = useMemo(() => (pal ? buildPal(pal) : null), [pal]);
  const inScene = Boolean(backdropGrid || palGrid);
  const grid = useMemo(() => buildSprout(mood, level, key ? (key.split(',') as AccessoryId[]) : []), [mood, level, key]);
  const pixel = pixelForLevel(level, size);
  // Frame fits the current stage (it only changes on a level-up); the cross-fading
  // sprites stack absolutely inside it.
  const frame = { width: WIDTH * pixel, height: HEIGHT * pixel };

  // Mood change or level-up: a quick pop.
  useEffect(() => {
    scale.value = withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { damping: 6, stiffness: 180 }));
  }, [mood, level, scale]);

  // Idle breathing so Sprout always feels alive; slower and shallower when wilting.
  useEffect(() => {
    const depth = mood === 'wilting' ? 1.015 : 1.04;
    breathe.value = withRepeat(withTiming(depth, { duration: mood === 'wilting' ? 2200 : 1300 }), -1, true);
  }, [mood, breathe]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: jump.value }, { scale: scale.value }, { scaleY: breathe.value }],
  }));

  const tap = () => {
    jump.set(withSequence(withTiming(-24, { duration: 150 }), withSpring(0, { damping: 5, stiffness: 200 })));
    onPress?.();
  };

  const colors = palette(mood);
  const sprout = (
    <Animated.View style={[styles.frame, frame, animated]}>
      <Animated.View key={`${mood}-${level}-${key}`} entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.sprite}>
        <PixelGrid grid={grid} palette={colors} pixel={pixel} />
      </Animated.View>
    </Animated.View>
  );

  return (
    <Pressable onPress={tap} disabled={!onPress} accessibilityRole="button" accessibilityLabel={`Sprout is ${mood}. Tap to say hi.`}>
      {inScene ? (
        // A still scene (backdrop and pal) with Sprout standing in it, feet on the bottom edge.
        <View style={[styles.scene, { width: SCENE_WIDTH * pixel, height: SCENE_HEIGHT * pixel }]}>
          {backdropGrid && (
            <View style={styles.layer}>
              <PixelGrid grid={backdropGrid} palette={colors} pixel={pixel} />
            </View>
          )}
          <View style={[styles.layer, { left: SCENE_LEFT * pixel, top: SCENE_TOP * pixel }]}>{sprout}</View>
          {palGrid && (
            <View style={[styles.layer, { left: PAL_ORIGIN.col * pixel, top: PAL_ORIGIN.row * pixel }]}>
              <PixelGrid grid={palGrid} palette={colors} pixel={pixel} />
            </View>
          )}
        </View>
      ) : (
        sprout
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end', transformOrigin: 'bottom' },
  sprite: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  scene: { alignSelf: 'center' },
  layer: { position: 'absolute', left: 0, top: 0 },
});
