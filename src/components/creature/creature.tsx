import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { CreatureMood } from '@/lib/rules/creature';

/**
 * One static pose per mood, cross-faded with a small scale bounce on change.
 * Deliberately not an animation rig. When the final illustrations land in
 * /assets/creature, swap <Pose> for an <Image> keyed by mood — nothing else changes.
 */
type PoseSpec = {
  body: string;
  cheek: string;
  /** 1 = upright, <1 = slumped */
  height: number;
  eyes: 'open' | 'happy' | 'sleepy' | 'sad';
  mouth: 'smile' | 'grin' | 'flat' | 'open' | 'frown';
  leaf: string | null;
  glow: boolean;
};

const POSES: Record<CreatureMood, PoseSpec> = {
  celebrating: { body: '#7ED6A0', cheek: '#FF9DA7', height: 1.05, eyes: 'happy', mouth: 'grin', leaf: '#3FA65F', glow: true },
  thriving: { body: '#8FD9A8', cheek: '#FFB0B8', height: 1, eyes: 'happy', mouth: 'smile', leaf: '#3FA65F', glow: false },
  content: { body: '#A8DDB5', cheek: '#FFC4CA', height: 0.97, eyes: 'open', mouth: 'smile', leaf: '#5DB374', glow: false },
  hungry: { body: '#D6DDA0', cheek: '#F3C7A0', height: 0.92, eyes: 'open', mouth: 'open', leaf: '#9BB65A', glow: false },
  wilting: { body: '#C9C3A6', cheek: '#D8C0B0', height: 0.8, eyes: 'sad', mouth: 'frown', leaf: '#A89A6A', glow: false },
};

const SIZE = 150;

function Eye({ kind }: { kind: PoseSpec['eyes'] }) {
  if (kind === 'happy') return <View style={[styles.eyeArc, { borderTopWidth: 4, borderBottomWidth: 0 }]} />;
  if (kind === 'sleepy' || kind === 'sad')
    return <View style={[styles.eyeArc, { borderBottomWidth: 4, borderTopWidth: 0, transform: [{ rotate: kind === 'sad' ? '8deg' : '0deg' }] }]} />;
  return <View style={styles.eyeDot} />;
}

function Mouth({ kind }: { kind: PoseSpec['mouth'] }) {
  switch (kind) {
    case 'grin':
      return <View style={[styles.mouth, { width: 34, height: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: '#1D2B22' }]} />;
    case 'smile':
      return <View style={[styles.mouth, { width: 26, height: 12, borderBottomWidth: 4, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }]} />;
    case 'open':
      return <View style={[styles.mouth, { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1D2B22' }]} />;
    case 'frown':
      return <View style={[styles.mouth, { width: 24, height: 10, borderTopWidth: 4, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: 6 }]} />;
    default:
      return <View style={[styles.mouth, { width: 20, height: 4, backgroundColor: '#1D2B22', borderRadius: 2 }]} />;
  }
}

function Pose({ spec }: { spec: PoseSpec }) {
  const bodyHeight = SIZE * 0.78 * spec.height;
  return (
    <View style={styles.pose}>
      {spec.glow && <View style={[styles.glow, { backgroundColor: spec.body }]} />}
      {spec.leaf && (
        <View style={[styles.leafStem, { bottom: bodyHeight - 4 }]}>
          <View style={[styles.leaf, { backgroundColor: spec.leaf, transform: [{ rotate: spec.height < 0.9 ? '70deg' : '-35deg' }] }]} />
        </View>
      )}
      <View style={[styles.body, { height: bodyHeight, backgroundColor: spec.body }]}>
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
    </View>
  );
}

export function Creature({ mood }: { mood: CreatureMood }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { damping: 6, stiffness: 180 }));
  }, [mood, scale]);

  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.frame, bounce]} accessibilityLabel={`Your creature is ${mood}`}>
      <Animated.View key={mood} entering={FadeIn.duration(350)} exiting={FadeOut.duration(350)} style={StyleSheet.absoluteFill}>
        <Pose spec={POSES[mood]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { width: SIZE, height: SIZE, alignSelf: 'center' },
  pose: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  glow: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, opacity: 0.35, top: 0 },
  body: {
    width: SIZE * 0.82,
    borderTopLeftRadius: SIZE * 0.45,
    borderTopRightRadius: SIZE * 0.45,
    borderBottomLeftRadius: SIZE * 0.3,
    borderBottomRightRadius: SIZE * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  leafStem: { position: 'absolute', width: 4, height: 22, backgroundColor: '#4E7F52', borderRadius: 2, alignItems: 'center' },
  leaf: { position: 'absolute', top: -10, left: 2, width: 26, height: 14, borderTopLeftRadius: 14, borderBottomRightRadius: 14 },
  eyes: { flexDirection: 'row', gap: 30 },
  eyeDot: { width: 12, height: 14, borderRadius: 7, backgroundColor: '#1D2B22' },
  eyeArc: { width: 16, height: 9, borderColor: '#1D2B22', borderLeftWidth: 0, borderRightWidth: 0, borderRadius: 8 },
  cheeks: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cheek: { width: 16, height: 9, borderRadius: 5, opacity: 0.8 },
  mouth: { borderColor: '#1D2B22' },
});
