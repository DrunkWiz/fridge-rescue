import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { buildAccessory, palette } from '@/components/creature/sprites';
import { PixelBar } from '@/components/pixel-bar';
import { PixelGrid } from '@/components/pixel-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekStars } from '@/components/week-stars';
import { formatMoney } from '@/lib/format';
import { moneySaved } from '@/lib/rules/money';
import { useTheme } from '@/hooks/use-theme';
import { useIsPro } from '@/lib/purchases';
import { creatureMood } from '@/lib/rules/creature';
import {
  ACCESSORIES,
  BADGES,
  completedChallenges,
  dailyStars,
  earnedBadges,
  growth,
  STAGES,
  totalXp,
  unlockedAccessories,
  wasteFreeStreak,
  XP_PER_DONATED_UNIT,
  XP_PER_RESCUED_UNIT,
  type AccessoryId,
} from '@/lib/rules/progress';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

const ACCESSORY_PALETTE = palette('content');
const LOCKED_PALETTE = Object.fromEntries(Object.keys(ACCESSORY_PALETTE).map((k) => [k, '#C9C9C2']));

function Stat({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, styles.stat, { borderColor: theme.border }]}>
      <ThemedText type="monoLarge">{value}</ThemedText>
      <ThemedText type="mono" themeColor="textSecondary" style={[styles.center, styles.tiny]}>
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
  const bought = useGame((s) => s.bought);
  const checkIns = useGame((s) => s.checkIns);
  const toggleAccessory = useGame((s) => s.toggleAccessory);
  const isPro = useIsPro();

  const now = new Date();
  const g = growth(totalXp(items));
  const badges = earnedBadges(items, now, startedAt);
  const unlocked = unlockedAccessories(badges, isPro, bought);

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
          <ThemedText type="mono" style={styles.center}>
            <ThemedText type="mono" style={{ fontWeight: 700 }}>
              lv {g.stage.level} · {g.stage.name.toLowerCase()}
            </ThemedText>
            {g.next ? `  ${g.next.minXp - g.xp} xp to ${g.next.name.toLowerCase()}` : '  fully grown'}
          </ThemedText>
          <PixelBar progress={g.progress} />
          <View style={styles.stages}>
            {STAGES.map((s) => (
              <ThemedText
                key={s.level}
                type="mono"
                themeColor={s.level <= g.stage.level ? 'text' : 'textSecondary'}
                style={[styles.tiny, s.level === g.stage.level && { fontWeight: 700 }]}>
                {s.level <= g.stage.level ? '■' : '□'} {s.name.toLowerCase()}
              </ThemedText>
            ))}
          </View>
          <ThemedText type="mono" themeColor="textSecondary" style={[styles.center, styles.tiny]}>
            +{XP_PER_RESCUED_UNIT} xp per item rescued · +{XP_PER_DONATED_UNIT} per item donated
          </ThemedText>
        </View>

        <View style={styles.row}>
          <Stat value={`${wasteFreeStreak(items, now, startedAt)}`} label="🔥 days waste-free" />
          <Stat value={formatMoney(moneySaved(items))} label="💰 saved" />
          <Stat value={`${completedChallenges(items, now, startedAt).length}`} label="🎯 challenges" />
        </View>

        <View style={[styles.card, styles.stars, { borderColor: theme.border }]}>
          <ThemedText type="mono" themeColor="textSecondary" style={[styles.tiny, styles.center]}>
            ⭐ opened your fridge · 🌟 saved food that day
          </ThemedText>
          <WeekStars days={dailyStars(items, checkIns, now)} />
        </View>

        <ThemedText type="mono" style={styles.heading}>
          badges {badges.length}/{BADGES.length}
        </ThemedText>
        <View style={styles.grid}>
          {BADGES.map((b) => {
            const got = badges.includes(b.id);
            return (
              <View key={b.id} style={[styles.card, styles.badge, { borderColor: got ? theme.border : theme.backgroundSelected }]}>
                <View style={styles.badgeArt}>
                  <PixelGrid grid={buildAccessory(b.reward)} palette={got ? ACCESSORY_PALETTE : LOCKED_PALETTE} pixel={4} />
                </View>
                <ThemedText type="mono" style={[styles.center, { fontWeight: 700 }]} themeColor={got ? 'text' : 'textSecondary'}>
                  {got ? '' : '🔒 '}
                  {b.title.toLowerCase()}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  {b.description}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <ThemedText type="mono" style={styles.heading}>
          wardrobe
        </ThemedText>
        <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
          tap to put on or take off. locked items come from badges, the shop or pro.
        </ThemedText>
        <View style={styles.wardrobe}>
          {Object.values(ACCESSORIES).map((a) => {
            const has = unlocked.includes(a.id);
            const wearing = equipped[a.slot] === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => wear(a.id)}
                accessibilityLabel={`${a.name}${has ? (wearing ? ', wearing' : '') : a.proOnly ? ', Pro' : ', locked'}`}
                style={[styles.accessory, { borderColor: wearing ? theme.tint : has ? theme.border : theme.backgroundSelected }]}>
                <View style={styles.accessoryArt}>
                  <PixelGrid grid={buildAccessory(a.id)} palette={has ? ACCESSORY_PALETTE : LOCKED_PALETTE} pixel={4} />
                </View>
                <ThemedText type="mono" style={[styles.center, styles.tiny]} numberOfLines={1} themeColor={has ? 'text' : 'textSecondary'}>
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
  tiny: { fontSize: 12, lineHeight: 16 },
  block: { gap: 6 },
  stages: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  card: { borderWidth: 1.5, borderRadius: 6 },
  stars: { padding: 10, gap: 6 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  heading: { marginTop: 8, fontWeight: 700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '48.5%', padding: 10, alignItems: 'center', gap: 4 },
  badgeArt: { height: 44, justifyContent: 'center' },
  wardrobe: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accessory: { width: '18.5%', minWidth: 58, paddingVertical: 8, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', gap: 4 },
  accessoryArt: { height: 40, justifyContent: 'center' },
});
