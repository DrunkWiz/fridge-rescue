import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CelebrationOverlay } from '@/components/celebration';
import { Creature } from '@/components/creature/creature';
import { ItemRow } from '@/components/item-row';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useProSource } from '@/lib/purchases';
import { creatureMood, lifetimeImpact, type CreatureMood } from '@/lib/rules/creature';
import { daysUntil } from '@/lib/rules/dates';
import { growth, savesThisWeek, totalXp, wasteFreeStreak, WEEKLY_GOAL } from '@/lib/rules/progress';
import { countUnits, estimateMeals, findDonationCandidates } from '@/lib/rules/surplus';
import { findRescueCandidates, sortByUrgency } from '@/lib/rules/urgency';
import type { Item } from '@/lib/types';
import { useGame, withCelebration, withWasteNudge } from '@/store/game';
import { useItems } from '@/store/items';

const MOOD_LINE: Record<CreatureMood, string> = {
  celebrating: 'You donated food — Sprout is glowing!',
  thriving: 'Sprout is thriving on everything you rescued.',
  content: 'Sprout is content. Keep an eye on the dates.',
  hungry: 'Sprout is hungry — something needs rescuing.',
  wilting: 'Sprout is wilting. Food went to waste this week.',
};

/** What Sprout says when tapped: always about something the user can do right now. */
function sproutLines(items: Item[], now: Date, startedAt: string | null): string[] {
  const lines: string[] = [];
  const rescue = findRescueCandidates(items, now);
  if (rescue[0]) {
    const days = daysUntil(rescue[0].expiresAt, now);
    lines.push(`Psst… the ${rescue[0].name.toLowerCase()} ${days === 0 ? 'expires today' : days === 1 ? 'expires tomorrow' : `has ${days} days left`}. Cook me something?`);
  }
  const surplus = countUnits(findDonationCandidates(items, now));
  if (surplus > 0) lines.push(`We've got ${surplus} spare things someone else could eat. Road trip to the food bank? 📦`);
  const streak = wasteFreeStreak(items, now, startedAt);
  if (streak >= 2) lines.push(`${streak} days without wasting anything. Let's keep it going! 🔥`);
  const left = WEEKLY_GOAL - savesThisWeek(items, now);
  if (left > 0) lines.push(`${left} more save${left === 1 ? '' : 's'} this week and we hit our goal 🎯`);
  else lines.push('Weekly goal done! You are my favourite human 💚');
  const g = growth(totalXp(items));
  if (g.next) lines.push(`${g.next.minXp - g.xp} XP until I grow into a ${g.next.name} 🌱`);
  lines.push('Hi! 👋', 'Did you know? Food banks love tins and dried pasta the most.', 'Tap “Load a demo fridge” if you want to play with me.');
  return items.length ? lines.slice(0, -1) : lines;
}

function ActionButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: color, opacity: pressed ? 0.6 : 1 }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ItemActions({ item, onDone }: { item: Item; onDone: () => void }) {
  const theme = useTheme();
  const setStatus = useItems((s) => s.setStatus);
  const setOpened = useItems((s) => s.setOpened);
  const removeItem = useItems((s) => s.removeItem);
  const run = (fn: () => void) => () => {
    fn();
    onDone();
  };
  return (
    <View style={styles.actions}>
      <ActionButton label="Used it" color={theme.tint} onPress={run(() => withCelebration(() => setStatus(item.id, 'used')))} />
      <ActionButton
        label={item.opened ? 'Mark unopened' : 'Mark opened'}
        color={theme.textSecondary}
        onPress={run(() => setOpened(item.id, !item.opened))}
      />
      <ActionButton
        label="Binned it"
        color={theme.danger}
        onPress={run(() =>
          withWasteNudge(() => setStatus(item.id, 'wasted'), wasteFreeStreak(useItems.getState().items, new Date(), useItems.getState().startedAt)),
        )}
      />
      <ActionButton label="Remove" color={theme.textSecondary} onPress={run(() => removeItem(item.id))} />
    </View>
  );
}

function BranchCard({ title, body, color, onPress }: { title: string; body: string; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.branch, { backgroundColor: theme.backgroundElement, borderColor: color, opacity: pressed ? 0.75 : 1 }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {title}
      </ThemedText>
      <ThemedText type="small">{body}</ThemedText>
    </Pressable>
  );
}

/** The two branches: expiring perishables get cooked, long-life surplus gets donated. */
function Branches({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const rescue = findRescueCandidates(items, now);
  const surplus = findDonationCandidates(items, now);
  const units = countUnits(surplus);
  if (rescue.length === 0 && surplus.length === 0) return null;
  return (
    <View style={styles.row}>
      {rescue.length > 0 && (
        <BranchCard
          title="Rescue"
          body={`${rescue.length} item${rescue.length === 1 ? '' : 's'} to cook soon`}
          color={theme.warning}
          onPress={() => router.push('/rescue')}
        />
      )}
      {surplus.length > 0 && (
        <BranchCard
          title="Donate"
          body={`${units} spare item${units === 1 ? '' : 's'} ≈ ${estimateMeals(units)} meals`}
          color={theme.tint}
          onPress={() => router.push('/donate')}
        />
      )}
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function Header({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const equipped = useGame((s) => s.equipped);
  const startedAt = useItems((s) => s.startedAt);
  const [bubble, setBubble] = useState<string | null>(null);

  const mood = creatureMood(items, now);
  const impact = lifetimeImpact(items);
  const g = growth(totalXp(items));
  const streak = wasteFreeStreak(items, now, startedAt);
  const saves = savesThisWeek(items, now);

  const say = () => {
    const lines = sproutLines(items, now, startedAt).filter((l) => l !== bubble);
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
  };

  return (
    <View style={styles.header}>
      <View style={styles.creatureArea}>
        {bubble && (
          <Animated.View
            key={bubble}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.bubble, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">{bubble}</ThemedText>
          </Animated.View>
        )}
        <Creature mood={mood} level={g.stage.level} equipped={equipped} onPress={say} />
      </View>
      <ThemedText style={styles.center}>{MOOD_LINE[mood]}</ThemedText>

      <Pressable onPress={() => router.push('/sprout')} style={styles.growth} accessibilityRole="button" accessibilityHint="Opens Sprout's badges and wardrobe">
        <View style={styles.growthLabels}>
          <ThemedText type="smallBold">
            Lv {g.stage.level} · {g.stage.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {g.next ? `${g.xp} / ${g.next.minXp} XP` : `${g.xp} XP · fully grown`}
          </ThemedText>
        </View>
        <ProgressBar progress={g.progress} color={theme.tint} />
      </Pressable>

      <View style={styles.row}>
        <Chip label={`🔥 ${streak} day${streak === 1 ? '' : 's'} waste-free`} onPress={() => router.push('/sprout')} />
        <Chip label={saves >= WEEKLY_GOAL ? `🎯 Weekly goal done!` : `🎯 ${saves}/${WEEKLY_GOAL} saves this week`} onPress={() => router.push('/sprout')} />
      </View>

      <Pressable
        onPress={() => router.push('/impact')}
        accessibilityRole="button"
        accessibilityHint="Opens your impact history"
        style={[styles.counters, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.counter}>
          <ThemedText type="subtitle" style={{ color: theme.tint }}>
            {impact.mealsRescued}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            meals rescued
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.counter}>
          <ThemedText type="subtitle" style={{ color: theme.tint }}>
            {impact.mealsDonated}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            meals donated
          </ThemedText>
        </View>
      </Pressable>
      <Branches items={items} now={now} />
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const loadDemoData = useItems((s) => s.loadDemoData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const proSource = useProSource();

  // Recomputed per render so day boundaries roll over without a timer.
  const now = new Date();
  const active = useMemo(() => sortByUrgency(items), [items]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/paywall')}
              onLongPress={() => router.push('/admin')}
              style={[styles.proPill, { borderColor: proSource === 'admin' ? theme.warning : theme.tint }]}>
              <ThemedText type="smallBold" style={{ color: proSource === 'admin' ? theme.warning : theme.tint }}>
                {proSource === 'purchase' ? 'Pro ✓' : proSource === 'admin' ? 'Pro (admin)' : 'Go Pro'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        ListHeaderComponent={<Header items={items} now={now} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Your fridge is empty. Add what you bought, and Sprout will tell you what needs eating first.
            </ThemedText>
            <Pressable onPress={loadDemoData}>
              <ThemedText type="linkPrimary">Load a demo fridge</ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemBlock}>
            <ItemRow item={item} now={now} onPress={() => setSelectedId(selectedId === item.id ? null : item.id)} />
            {selectedId === item.id && <ItemActions item={item} onDone={() => setSelectedId(null)} />}
          </View>
        )}
      />
      <Pressable
        onPress={() => router.push('/add-item')}
        style={[styles.fab, { backgroundColor: theme.tint, bottom: insets.bottom + 24 }]}>
        <ThemedText type="smallBold" style={{ color: theme.onTint, fontSize: 16 }}>
          + Add item
        </ThemedText>
      </Pressable>
      <CelebrationOverlay />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 12, gap: 12 },
  creatureArea: { alignItems: 'center', paddingTop: 8 },
  bubble: { position: 'absolute', top: -4, zIndex: 2, maxWidth: 280, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  center: { textAlign: 'center' },
  growth: { alignSelf: 'stretch', gap: 6 },
  growthLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  chip: { flex: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  counters: { flexDirection: 'row', borderRadius: 16, paddingVertical: 10, alignSelf: 'stretch' },
  counter: { flex: 1, alignItems: 'center' },
  divider: { width: 1, marginVertical: 6 },
  branch: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 2 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 24 },
  itemBlock: { gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  action: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  proPill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginRight: 12 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
  },
});
