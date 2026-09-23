import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { ItemRow } from '@/components/item-row';
import { PixelBar } from '@/components/pixel-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeekStars } from '@/components/week-stars';
import { useTheme } from '@/hooks/use-theme';
import { creatureMood, lifetimeImpact, type CreatureMood } from '@/lib/rules/creature';
import { daysUntil } from '@/lib/rules/dates';
import {
  currentChallenge,
  dailyStars,
  growth,
  SEEDS_PER_CHECK_IN,
  savesThisWeek,
  totalXp,
  wasteFreeStreak,
  WEEKLY_GOAL,
} from '@/lib/rules/progress';
import { countUnits, estimateMeals, findDonationCandidates } from '@/lib/rules/surplus';
import { findRescueCandidates, sortByUrgency } from '@/lib/rules/urgency';
import type { Item } from '@/lib/types';
import { useGame, useSeedBalance, withCelebration, withWasteNudge } from '@/store/game';
import { useItems } from '@/store/items';

/** Deadpan, lowercase, one line — the app's voice. */
const STATUS: Record<CreatureMood, string> = {
  celebrating: 'sprout is glowing. you fed a stranger.',
  thriving: 'sprout is thriving.',
  content: 'sprout is fine. for now.',
  hungry: 'sprout is hungry.',
  wilting: 'sprout is wilting.',
};

/** What Sprout says when tapped: always about something the user can do right now. */
function sproutLines(items: Item[], now: Date, startedAt: string | null): string[] {
  const lines: string[] = [];
  const rescue = findRescueCandidates(items, now);
  if (rescue[0]) {
    const days = daysUntil(rescue[0].expiresAt, now);
    const when = days === 0 ? 'expires today' : days === 1 ? 'expires tomorrow' : `has ${days} days left`;
    lines.push(`psst. the ${rescue[0].name.toLowerCase()} ${when}. cook me something?`);
  }
  const surplus = countUnits(findDonationCandidates(items, now));
  if (surplus > 0) lines.push(`we have ${surplus} spare things someone else could eat. road trip? 📦`);
  const streak = wasteFreeStreak(items, now, startedAt);
  if (streak >= 2) lines.push(`${streak} days without wasting anything. don't ruin it. 🔥`);
  const left = WEEKLY_GOAL - savesThisWeek(items, now);
  lines.push(left > 0 ? `${left} more save${left === 1 ? '' : 's'} this week. 🎯` : 'weekly goal done. you are my favourite human.');
  const g = growth(totalXp(items));
  if (g.next) lines.push(`${g.next.minXp - g.xp} xp until i'm a ${g.next.name.toLowerCase()}.`);
  if (!items.length) lines.push('i am a seed. feed me groceries.', 'tap "load a demo fridge" to play.');
  lines.push('hi.', 'food banks love tins and dried pasta.');
  return lines;
}

function ActionButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: color, opacity: pressed ? 0.6 : 1 }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
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
      <ActionButton label="used it" color={theme.tint} onPress={run(() => withCelebration(() => setStatus(item.id, 'used')))} />
      <ActionButton
        label={item.opened ? 'unopened' : 'opened'}
        color={theme.textSecondary}
        onPress={run(() => setOpened(item.id, !item.opened))}
      />
      <ActionButton
        label="binned it"
        color={theme.danger}
        onPress={run(() =>
          withWasteNudge(() => setStatus(item.id, 'wasted'), wasteFreeStreak(useItems.getState().items, new Date(), useItems.getState().startedAt)),
        )}
      />
      <ActionButton label="remove" color={theme.textSecondary} onPress={run(() => removeItem(item.id))} />
    </View>
  );
}

function BranchCard({ title, body, color, onPress }: { title: string; body: string; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, styles.branch, { borderColor: color, backgroundColor: theme.background, opacity: pressed ? 0.75 : 1 }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
        {title} →
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
          title="rescue"
          body={`${rescue.length} item${rescue.length === 1 ? '' : 's'} to cook soon`}
          color={theme.warning}
          onPress={() => router.push('/rescue')}
        />
      )}
      {surplus.length > 0 && (
        <BranchCard
          title="donate"
          body={`${units} spare item${units === 1 ? '' : 's'} ≈ ${estimateMeals(units)} meals`}
          color={theme.tint}
          onPress={() => router.push('/donate')}
        />
      )}
    </View>
  );
}

/** Daily habit: look at what's expiring, tap, get a seed and today's star. */
function FridgeCheck({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const checkIns = useGame((s) => s.checkIns);
  const checkIn = useGame((s) => s.checkIn);
  const days = dailyStars(items, checkIns, now);
  const doneToday = days[days.length - 1].stars > 0;

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      {!doneToday ? (
        <Pressable onPress={checkIn} accessibilityRole="button" style={styles.checkRow}>
          <View style={[styles.checkbox, { borderColor: theme.text }]} />
          <View style={{ flex: 1 }}>
            <ThemedText type="mono" style={{ fontWeight: 700 }}>
              daily fridge check
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              glance at what&apos;s expiring below, then tap. +{SEEDS_PER_CHECK_IN} 🌱
            </ThemedText>
          </View>
        </Pressable>
      ) : (
        <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
          ✓ fridge checked today. see you tomorrow.
        </ThemedText>
      )}
      <WeekStars days={days} />
    </View>
  );
}

/** This week's challenge, with a pixel progress bar. */
function ChallengeCard({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const { challenge, progress, done } = currentChallenge(items, now);
  return (
    <View style={[styles.card, { borderColor: done ? theme.tint : theme.border }]}>
      <View style={styles.between}>
        <ThemedText type="mono" style={{ fontWeight: 700 }}>
          {done ? '✓ ' : ''}weekly challenge
        </ThemedText>
        <ThemedText type="mono" themeColor="textSecondary">
          +{challenge.reward} 🌱
        </ThemedText>
      </View>
      <ThemedText type="small">{challenge.title}</ThemedText>
      <View style={styles.between}>
        <View style={{ flex: 1 }}>
          <PixelBar progress={progress / challenge.goal} segments={challenge.goal * 3} color={done ? theme.tint : undefined} />
        </View>
        <ThemedText type="mono" style={{ marginLeft: 8 }}>
          {progress}/{challenge.goal}
        </ThemedText>
      </View>
    </View>
  );
}

function Header({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const equipped = useGame((s) => s.equipped);
  const startedAt = useItems((s) => s.startedAt);
  const seeds = useSeedBalance();
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
      <View style={styles.topRow}>
        <Pressable onPress={() => router.push('/shop')} accessibilityRole="button" accessibilityLabel={`${seeds} seeds, open shop`}>
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            🌱 {seeds}
          </ThemedText>
        </Pressable>
        <ThemedText type="mono" style={{ fontWeight: 700 }}>
          🔥 {streak}d waste-free
        </ThemedText>
      </View>

      <Pressable onPress={() => router.push('/sprout')} style={styles.xp} accessibilityRole="button" accessibilityHint="Opens Sprout">
        <ThemedText type="mono" style={styles.center}>
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            {g.xp}
          </ThemedText>
          {g.next ? ` /${g.next.minXp} xp` : ' xp · fully grown'}
        </ThemedText>
        <PixelBar progress={g.progress} />
        <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
          lv {g.stage.level} · {g.stage.name.toLowerCase()}
        </ThemedText>
      </Pressable>

      <View style={styles.creatureArea}>
        {bubble && (
          <Animated.View
            key={bubble}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[styles.bubble, { borderColor: theme.border, backgroundColor: theme.background }]}>
            <ThemedText type="mono">{bubble}</ThemedText>
          </Animated.View>
        )}
        <Creature mood={mood} level={g.stage.level} equipped={equipped} onPress={say} />
      </View>
      <ThemedText type="mono" style={styles.center}>
        {STATUS[mood]}
      </ThemedText>

      <FridgeCheck items={items} now={now} />
      <ChallengeCard items={items} now={now} />

      <View style={styles.row}>
        <Pressable onPress={() => router.push('/impact')} style={[styles.card, styles.stat, { borderColor: theme.border }]}>
          <ThemedText type="monoLarge" style={{ color: theme.tint }}>
            {impact.mealsRescued}
          </ThemedText>
          <ThemedText type="mono" themeColor="textSecondary">
            meals rescued
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/impact')} style={[styles.card, styles.stat, { borderColor: theme.border }]}>
          <ThemedText type="monoLarge" style={{ color: theme.tint }}>
            {impact.mealsDonated}
          </ThemedText>
          <ThemedText type="mono" themeColor="textSecondary">
            meals donated
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/sprout')} style={[styles.card, styles.stat, { borderColor: theme.border }]}>
          <ThemedText type="monoLarge">
            {Math.min(saves, WEEKLY_GOAL)}/{WEEKLY_GOAL}
          </ThemedText>
          <ThemedText type="mono" themeColor="textSecondary">
            weekly goal
          </ThemedText>
        </Pressable>
      </View>
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

  // Recomputed per render so day boundaries roll over without a timer.
  const now = new Date();
  const active = useMemo(() => sortByUrgency(items), [items]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={active}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        ListHeaderComponent={<Header items={items} now={now} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
              your fridge is empty. add what you bought and sprout will tell you what to eat first.
            </ThemedText>
            <Pressable onPress={loadDemoData}>
              <ThemedText type="mono" style={{ color: theme.tint, fontWeight: 700 }}>
                [ load a demo fridge ]
              </ThemedText>
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
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.text, bottom: 20, opacity: pressed ? 0.8 : 1 }]}>
        <ThemedText type="mono" style={{ color: theme.background, fontWeight: 700, fontSize: 16 }}>
          + add item
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 12, gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  xp: { alignSelf: 'stretch', gap: 4 },
  creatureArea: { alignItems: 'center', justifyContent: 'flex-end' },
  bubble: { position: 'absolute', top: -6, zIndex: 2, maxWidth: 280, borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  card: { borderWidth: 1.5, borderRadius: 6, padding: 12, gap: 10, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 0, paddingHorizontal: 4 },
  branch: { flex: 1, gap: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 2 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32, paddingHorizontal: 24 },
  itemBlock: { gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  action: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  fab: { position: 'absolute', alignSelf: 'center', borderRadius: 6, paddingHorizontal: 22, paddingVertical: 12 },
});
