import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

import type { CreatureMood } from '@/lib/rules/creature';
import { ACCESSORIES, type AccessoryId, type Slot } from '@/lib/rules/progress';

/**
 * One static pose per mood, cross-faded with a small scale bounce on change.
 * Deliberately not an animation rig. Growth stage (level 1–6) scales Sprout up
 * and adds foliage; accessories are emoji pinned to head / face / neck / float.
 */
type PoseSpec = {
  body: string;
  cheek: string;
  /** 1 = upright, <1 = slumped */
  height: number;
  eyes: 'open' | 'happy' | 'sad';
  mouth: 'smile' | 'grin' | 'open' | 'frown';
  leaf: string;
  glow: boolean;
};

const POSES: Record<CreatureMood, PoseSpec> = {
  celebrating: { body: '#7ED6A0', cheek: '#FF9DA7', height: 1.05, eyes: 'happy', mouth: 'grin', leaf: '#3FA65F', glow: true },
  thriving: { body: '#8FD9A8', cheek: '#FFB0B8', height: 1, eyes: 'happy', mouth: 'smile', leaf: '#3FA65F', glow: false },
  content: { body: '#A8DDB5', cheek: '#FFC4CA', height: 0.97, eyes: 'open', mouth: 'smile', leaf: '#5DB374', glow: false },
  hungry: { body: '#D6DDA0', cheek: '#F3C7A0', height: 0.92, eyes: 'open', mouth: 'open', leaf: '#9BB65A', glow: false },
  wilting: { body: '#C9C3A6', cheek: '#D8C0B0', height: 0.8, eyes: 'sad', mouth: 'frown', leaf: '#A89A6A', glow: false },
};

const FRAME = 180;
const BASE_BODY = 128;

/** Level 1 is a small seedling; level 6 is 40% bigger with a full canopy. */
const scaleForLevel = (level: number) => 0.72 + (level - 1) * 0.08;

const INK = '#1D2B22';

function Eye({ kind }: { kind: PoseSpec['eyes'] }) {
  if (kind === 'happy') return <View style={[styles.eyeArc, { borderTopWidth: 4, borderBottomWidth: 0 }]} />;
  if (kind === 'sad') return <View style={[styles.eyeArc, { borderBottomWidth: 4, borderTopWidth: 0, transform: [{ rotate: '8deg' }] }]} />;
  return <View style={styles.eyeDot} />;
}

function Mouth({ kind }: { kind: PoseSpec['mouth'] }) {
  switch (kind) {
    case 'grin':
      return <View style={{ width: 34, height: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: INK }} />;
    case 'smile':
      return <View style={{ width: 26, height: 12, borderBottomWidth: 4, borderColor: INK, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />;
    case 'open':
      return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: INK }} />;
    case 'frown':
      return <View style={{ width: 24, height: 10, borderTopWidth: 4, borderColor: INK, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 6 }} />;
  }
}

/** Foliage grows with the stage: one sprout leaf → two leaves → blossom → canopy. */
function Foliage({ level, color, droop, bodyTop }: { level: number; color: string; droop: boolean; bodyTop: number }) {
  const leaves: { angle: number; dx: number; size: number }[] =
    level <= 1
      ? [{ angle: -35, dx: 2, size: 0.7 }]
      : level <= 2
        ? [{ angle: -35, dx: 2, size: 1 }]
        : level <= 4
          ? [
              { angle: -35, dx: 2, size: 1 },
              { angle: 215, dx: -24, size: 0.9 },
            ]
          : [
              { angle: -35, dx: 2, size: 1.1 },
              { angle: 215, dx: -26, size: 1 },
              { angle: -80, dx: -8, size: 0.9 },
            ];
  return (
    <View style={[styles.stem, { top: bodyTop - 20 }]}>
      {leaves.map((leaf, i) => (
        <View
          key={i}
          style={[
            styles.leaf,
            {
              backgroundColor: color,
              left: leaf.dx,
              width: 26 * leaf.size,
              height: 14 * leaf.size,
              transform: [{ rotate: `${droop ? leaf.angle + 100 : leaf.angle}deg` }],
            },
          ]}
        />
      ))}
      {level >= 4 && !droop && <View style={[styles.blossom, { backgroundColor: level >= 6 ? '#FFD34E' : '#FF9DB8' }]} />}
    </View>
  );
}

function Pose({ spec, level, equipped }: { spec: PoseSpec; level: number; equipped: Partial<Record<Slot, AccessoryId>> }) {
  const scale = scaleForLevel(level);
  const bodyWidth = BASE_BODY * scale;
  const bodyHeight = BASE_BODY * 0.8 * scale * spec.height;
  const bodyTop = FRAME - bodyHeight;
  const emoji = (slot: Slot) => (equipped[slot] ? ACCESSORIES[equipped[slot]!].emoji : null);

  return (
    <View style={styles.pose}>
      {spec.glow && <View style={[styles.glow, { backgroundColor: spec.body }]} />}
      <Foliage level={level} color={spec.leaf} droop={spec.height < 0.9} bodyTop={bodyTop} />
      <View
        style={[
          styles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            backgroundColor: spec.body,
            borderTopLeftRadius: bodyWidth * 0.55,
            borderTopRightRadius: bodyWidth * 0.55,
            borderBottomLeftRadius: bodyWidth * 0.36,
            borderBottomRightRadius: bodyWidth * 0.36,
          },
        ]}>
        <View style={styles.eyes}>
          <Eye kind={spec.eyes} />
          <Eye kind={spec.eyes} />
        </View>
        <View style={styles.cheeks}>
          <View style={[styles.cheek, { backgroundColor: spec.cheek }]} />
          <Mouth kind={spec.mouth} />
          <View style={[styles.cheek, { backgroundColor: spec.cheek }]} />
        </View>
      </View>

      {emoji('head') && <Text style={[styles.acc, { top: bodyTop - 30, fontSize: 36 }]}>{emoji('head')}</Text>}
      {emoji('face') && <Text style={[styles.acc, { top: bodyTop + bodyHeight * 0.5 - 38, fontSize: 40 }]}>{emoji('face')}</Text>}
      {emoji('neck') && <Text style={[styles.acc, { top: FRAME - 34, fontSize: 30 }]}>{emoji('neck')}</Text>}
      {emoji('float') && <Text style={[styles.acc, styles.float, { top: bodyTop - 10 }]}>{emoji('float')}</Text>}
    </View>
  );
}

type Props = {
  mood: CreatureMood;
  level?: number;
  equipped?: Partial<Record<Slot, AccessoryId>>;
  onPress?: () => void;
};

export function Creature({ mood, level = 1, equipped = {}, onPress }: Props) {
  const scale = useSharedValue(1);
  const jump = useSharedValue(0);
  const breathe = useSharedValue(1);

  // Mood change or level-up: a quick pop.
  useEffect(() => {
    scale.value = withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { damping: 6, stiffness: 180 }));
  }, [mood, level, scale]);

  // Idle breathing so Sprout always feels alive; slower and shallower when wilting.
  useEffect(() => {
    const depth = mood === 'wilting' ? 1.015 : 1.035;
    breathe.value = withRepeat(withTiming(depth, { duration: mood === 'wilting' ? 2200 : 1400 }), -1, true);
  }, [mood, breathe]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: jump.value }, { scale: scale.value }, { scaleY: breathe.value }],
  }));

  const tap = () => {
    jump.set(withSequence(withTiming(-26, { duration: 160 }), withSpring(0, { damping: 5, stiffness: 200 })));
    onPress?.();
  };

  return (
    <Pressable onPress={tap} accessibilityRole="button" accessibilityLabel={`Sprout is ${mood}. Tap to say hi.`}>
      <Animated.View style={[styles.frame, animated]}>
        <Animated.View key={mood} entering={FadeIn.duration(350)} exiting={FadeOut.duration(350)} style={StyleSheet.absoluteFill}>
          <Pose spec={POSES[mood]} level={level} equipped={equipped} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: FRAME, height: FRAME, alignSelf: 'center', transformOrigin: 'bottom' },
  pose: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  glow: { position: 'absolute', width: FRAME, height: FRAME, borderRadius: FRAME / 2, opacity: 0.35, top: 0 },
  body: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  stem: { position: 'absolute', width: 4, height: 24, backgroundColor: '#4E7F52', borderRadius: 2, alignItems: 'center' },
  leaf: { position: 'absolute', top: -8, borderTopLeftRadius: 14, borderBottomRightRadius: 14 },
  blossom: { position: 'absolute', top: -18, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFF4B8' },
  eyes: { flexDirection: 'row', gap: 30 },
  eyeDot: { width: 12, height: 14, borderRadius: 7, backgroundColor: INK },
  eyeArc: { width: 16, height: 9, borderColor: INK, borderLeftWidth: 0, borderRightWidth: 0, borderRadius: 8 },
  cheeks: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cheek: { width: 16, height: 9, borderRadius: 5, opacity: 0.8 },
  acc: { position: 'absolute', alignSelf: 'center', textAlign: 'center' },
  float: { fontSize: 28, right: 14, alignSelf: 'auto' },
});
