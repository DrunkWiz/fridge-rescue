import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { buildAccessory, palette } from '@/components/creature/sprites';
import { PixelGrid } from '@/components/pixel-grid';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useIsPro } from '@/lib/purchases';
import { creatureMood } from '@/lib/rules/creature';
import {
  ACCESSORIES,
  BADGES,
  earnedBadges,
  growth,
  savesThisWeek,
  STAGES,
  totalXp,
  unlockedAccessories,
  wasteFreeStreak,
  WEEKLY_GOAL,
  weeklyGoalStreak,
  XP_PER_DONATED_UNIT,
  XP_PER_RESCUED_UNIT,
  type AccessoryId,
} from '@/lib/rules/progress';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

const ACCESSORY_PALETTE = palette('content');

function Stat({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="subtitle" style={{ fontSize: 26, lineHeight: 32 }}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function SproutScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const startedAt = useItems((s) => s.startedAt);
  const equipped = useGame((s) => s.equipped);
  const toggleAccessory = useGame((s) => s.toggleAccessory);
  const bought = useGame((s) => s.bought);
  const isPro = useIsPro();

  const now = new Date();
  const g = growth(totalXp(items));
  const badges = earnedBadges(items, now, startedAt);
  const unlocked = unlockedAccessories(badges, isPro, bought);
  const saves = savesThisWeek(items, now);

  const wear = (id: AccessoryId) => {
    if (unlocked.includes(id)) toggleAccessory(id);
    else if (ACCESSORIES[id].proOnly) router.push('/paywall');
    else if (ACCESSORIES[id].price !== undefined) router.push('/shop');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Creature mood={creatureMood(items, now)} level={g.stage.level} equipped={equipped} />

        <View style={styles.block}>
          <View style={styles.between}>
            <ThemedText type="smallBold">
              Lv {g.stage.level} · {g.stage.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {g.next ? `${g.next.minXp - g.xp} XP to ${g.next.name}` : 'Fully grown 🌳'}
            </ThemedText>
          </View>
          <ProgressBar progress={g.progress} color={theme.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            +{XP_PER_RESCUED_UNIT} XP per item rescued · +{XP_PER_DONATED_UNIT} XP per item donated
          </ThemedText>
          <View style={styles.stages}>
            {STAGES.map((s) => (
              <ThemedText
                key={s.level}
                type="small"
                style={{ opacity: s.level <= g.stage.level ? 1 : 0.35, fontWeight: s.level === g.stage.level ? 700 : 500 }}>
                {s.level <= g.stage.level ? '●' : '○'} {s.name}
              </ThemedText>
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat value={`🔥 ${wasteFreeStreak(items, now, startedAt)}`} label="days waste-free" />
          <Stat value={`🎯 ${Math.min(saves, WEEKLY_GOAL)}/${WEEKLY_GOAL}`} label="saves this week" />
          <Stat value={`🏆 ${weeklyGoalStreak(items, now)}`} label="goal weeks in a row" />
        </View>

        <ThemedText type="smallBold" style={styles.heading}>
          Badges · {badges.length}/{BADGES.length}
        </ThemedText>
        <View style={styles.grid}>
          {BADGES.map((b) => {
            const got = badges.includes(b.id);
            return (
              <View key={b.id} style={[styles.badge, { backgroundColor: theme.backgroundElement, opacity: got ? 1 : 0.5 }]}>
                <Text style={styles.badgeEmoji}>{got ? '🏅' : '🔒'}</Text>
                <ThemedText type="smallBold" style={styles.center}>
                  {b.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  {b.description}
                </ThemedText>
                <ThemedText type="small" style={styles.center}>
                  Unlocks {ACCESSORIES[b.reward].emoji}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <ThemedText type="smallBold" style={styles.heading}>
          Wardrobe
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Earn accessories with badges. Tap to put on or take off.
        </ThemedText>
        <View style={styles.wardrobe}>
          {Object.values(ACCESSORIES).map((a) => {
            const has = unlocked.includes(a.id);
            const wearing = equipped[a.slot] === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => wear(a.id)}
                accessibilityLabel={`${a.name}${has ? '' : a.proOnly ? ', Pro' : ', locked'}`}
                style={[
                  styles.accessory,
                  { backgroundColor: theme.backgroundElement, borderColor: wearing ? theme.tint : 'transparent', opacity: has ? 1 : 0.4 },
                ]}>
                <View style={styles.accessoryArt}>
                  <PixelGrid grid={buildAccessory(a.id)} palette={ACCESSORY_PALETTE} pixel={4} />
                </View>
                <ThemedText type="mono" style={[styles.center, { fontSize: 11 }]} numberOfLines={1}>
                  {has ? a.name.toLowerCase() : a.proOnly ? 'pro' : a.price !== undefined ? `🌱${a.price}` : '🔒'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { textAlign: 'center' },
  block: { gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stages: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  heading: { marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '48.5%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 2 },
  badgeEmoji: { fontSize: 28 },
  wardrobe: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accessory: { width: '18.5%', minWidth: 58, paddingVertical: 8, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  accessoryArt: { height: 40, justifyContent: 'center' },
});
