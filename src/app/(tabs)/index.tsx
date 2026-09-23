import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { ItemRow } from '@/components/item-row';
import { PixelBar } from '@/components/pixel-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { creatureMood, type CreatureMood } from '@/lib/rules/creature';
import { daysUntil } from '@/lib/rules/dates';
import { awaitingAnswer, currentChallenge, growth, totalXp, wasteFreeStreak } from '@/lib/rules/progress';
import { countUnits, estimateMeals, findDonationCandidates } from '@/lib/rules/surplus';
import { canFreeze, findRescueCandidates, sortByUrgency } from '@/lib/rules/urgency';
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
  const g = growth(totalXp(items));
  if (g.next) lines.push(`${g.next.minXp - g.xp} xp until i'm a ${g.next.name.toLowerCase()}.`);
  if (!items.length) lines.push('i am a seed. feed me groceries.');
  lines.push('hi.', 'swipe right on food you ate. swipe left if it went in the bin.');
  return lines;
}

// ── Item actions ────────────────────────────────────────────────────────────

const ateIt = (item: Item) => withCelebration(() => useItems.getState().setStatus(item.id, 'used'), `ate the ${item.name.toLowerCase()}`);
const binnedIt = (item: Item) => withWasteNudge(() => useItems.getState().setStatus(item.id, 'wasted'), `binned the ${item.name.toLowerCase()}`);
const frozeIt = (item: Item) => withCelebration(() => useItems.getState().freeze(item.id), `froze the ${item.name.toLowerCase()} · 60 more days`);

function SmallButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.small, { borderColor: color, opacity: pressed ? 0.6 : 1 }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MoreActions({ item, onDone }: { item: Item; onDone: () => void }) {
  const theme = useTheme();
  const run = (fn: () => void) => () => {
    fn();
    onDone();
  };
  return (
    <View style={styles.actions}>
      <SmallButton label="ate it" color={theme.tint} onPress={run(() => ateIt(item))} />
      {canFreeze(item) && <SmallButton label="froze it ❄" color={theme.text} onPress={run(() => frozeIt(item))} />}
      <SmallButton
        label={item.opened ? 'unopened' : 'opened'}
        color={theme.textSecondary}
        onPress={run(() => useItems.getState().setOpened(item.id, !item.opened))}
      />
      <SmallButton label="binned it" color={theme.danger} onPress={run(() => binnedIt(item))} />
      <SmallButton label="remove" color={theme.textSecondary} onPress={run(() => useItems.getState().removeItem(item.id))} />
    </View>
  );
}

function SwipeAction({ label, color, align }: { label: string; color: string; align: 'left' | 'right' }) {
  return (
    <View style={[styles.swipeAction, { backgroundColor: color, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}>
      <ThemedText type="mono" style={{ color: '#fff', fontWeight: 700 }}>
        {label}
      </ThemedText>
    </View>
  );
}

/** Swipe right = ate it, swipe left = binned it. Tap for everything else. */
function FridgeItem({ item, now, expanded, onToggle }: { item: Item; now: Date; expanded: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.itemBlock}>
      <ReanimatedSwipeable
        friction={1.5}
        leftThreshold={80}
        rightThreshold={80}
        renderLeftActions={() => <SwipeAction label="✓ ate it" color={theme.tint} align="left" />}
        renderRightActions={() => <SwipeAction label="binned ✕" color={theme.danger} align="right" />}
        // `direction` is the way the row moved: right reveals the left-hand "ate it" panel.
        onSwipeableOpen={(direction) => (direction === 'right' ? ateIt(item) : binnedIt(item))}>
        <ItemRow item={item} now={now} onPress={onToggle} />
      </ReanimatedSwipeable>
      {expanded && <MoreActions item={item} onDone={onToggle} />}
    </View>
  );
}

// ── Header and "today" ──────────────────────────────────────────────────────

function Header({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const equipped = useGame((s) => s.equipped);
  const startedAt = useItems((s) => s.startedAt);
  const seeds = useSeedBalance();
  const [bubble, setBubble] = useState<string | null>(null);

  const mood = creatureMood(items, now);
  const g = growth(totalXp(items));
  const streak = wasteFreeStreak(items, now, startedAt);

  const say = () => {
    const lines = sproutLines(items, now, startedAt).filter((l) => l !== bubble);
    setBubble(lines[Math.floor(Math.random() * lines.length)]);
  };

  return (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Creature mood={mood} level={g.stage.level} equipped={equipped} onPress={say} size="small" />
        <Pressable style={styles.headerInfo} onPress={() => router.push('/sprout')} accessibilityRole="button" accessibilityHint="Opens Sprout">
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            {STATUS[mood]}
          </ThemedText>
          <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
            lv {g.stage.level} {g.stage.name.toLowerCase()} · {g.next ? `${g.xp}/${g.next.minXp} xp` : `${g.xp} xp`}
          </ThemedText>
          <PixelBar progress={g.progress} segments={10} />
          <ThemedText type="mono" style={styles.tiny}>
            🌱 {seeds} · 🔥 {streak}d waste-free
          </ThemedText>
        </Pressable>
      </View>
      {bubble && (
        <Animated.View
          key={bubble}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.bubble, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <ThemedText type="mono">{bubble}</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}

/** Expired food isn't assumed wasted: ask first. */
function DidYouEatIt({ items }: { items: Item[] }) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={[styles.card, { borderColor: theme.warning }]}>
      <ThemedText type="mono" style={{ fontWeight: 700 }}>
        did you eat {items.length === 1 ? 'this' : 'these'}?
      </ThemedText>
      {items.map((item) => (
        <View key={item.id} style={styles.askRow}>
          <ThemedText style={{ flex: 1 }} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <SmallButton label="ate it" color={theme.tint} onPress={() => ateIt(item)} />
          <SmallButton label="binned" color={theme.danger} onPress={() => binnedIt(item)} />
        </View>
      ))}
    </View>
  );
}

function BranchCard({ title, body, color, onPress }: { title: string; body: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.branch, { borderColor: color, opacity: pressed ? 0.75 : 1 }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
        {title} →
      </ThemedText>
      <ThemedText type="small">{body}</ThemedText>
    </Pressable>
  );
}

function ChallengeLine({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const { challenge, progress, done } = currentChallenge(items, now);
  return (
    <View style={styles.challenge}>
      <ThemedText type="mono" style={styles.tiny} numberOfLines={1}>
        {done ? '✓ ' : '🎯 '}this week: {challenge.title} · +{challenge.reward} 🌱
      </ThemedText>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <PixelBar progress={progress / challenge.goal} segments={challenge.goal * 3} color={done ? theme.tint : undefined} />
        </View>
        <ThemedText type="mono" style={[styles.tiny, { marginLeft: 8 }]}>
          {progress}/{challenge.goal}
        </ThemedText>
      </View>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

type Row = { type: 'heading'; key: string; text: string } | { type: 'item'; key: string; item: Item };

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const loadDemoData = useItems((s) => s.loadDemoData);
  const checkIn = useGame((s) => s.checkIn);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Recomputed per render so day boundaries roll over without a timer.
  const now = new Date();
  const asking = awaitingAnswer(items, now);
  const rescue = findRescueCandidates(items, now);
  const surplus = findDonationCandidates(items, now);
  const units = countUnits(surplus);

  // Opening the fridge is the daily check-in: no extra tap to fake it.
  const hasItems = items.length > 0;
  useEffect(() => {
    if (hasItems) checkIn();
  }, [hasItems, checkIn]);

  // "use soon" first, then everything else; expired items are asked about above.
  const rows = useMemo<Row[]>(() => {
    const today = new Date();
    const askingIds = new Set(awaitingAnswer(items, today).map((i) => i.id));
    const soon = findRescueCandidates(items, today);
    const soonIds = new Set(soon.map((i) => i.id));
    const rest = sortByUrgency(items).filter((i) => !askingIds.has(i.id) && !soonIds.has(i.id));
    return [
      ...(soon.length ? [{ type: 'heading' as const, key: 'h-soon', text: 'use soon' }] : []),
      ...soon.map((item) => ({ type: 'item' as const, key: item.id, item })),
      ...(rest.length ? [{ type: 'heading' as const, key: 'h-rest', text: 'rest of your fridge' }] : []),
      ...rest.map((item) => ({ type: 'item' as const, key: item.id, item })),
    ];
  }, [items]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        ListHeaderComponent={
          <View style={styles.top}>
            <Header items={items} now={now} />
            {hasItems && (
              <>
                <DidYouEatIt items={asking} />
                {(rescue.length > 0 || surplus.length > 0) && (
                  <View style={styles.row}>
                    {rescue.length > 0 && (
                      <BranchCard title="rescue" body={`${rescue.length} to cook soon`} color={theme.warning} onPress={() => router.push('/rescue')} />
                    )}
                    {surplus.length > 0 && (
                      <BranchCard
                        title="donate"
                        body={`${units} spare ≈ ${estimateMeals(units)} meals`}
                        color={theme.tint}
                        onPress={() => router.push('/donate')}
                      />
                    )}
                  </View>
                )}
                <ChallengeLine items={items} now={now} />
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
              your fridge is empty. add what you bought and sprout will tell you what to eat first.
            </ThemedText>
            <Pressable onPress={() => router.push('/scan')}>
              <ThemedText type="mono" style={{ color: theme.tint, fontWeight: 700 }}>
                [ 📷 scan a receipt ]
              </ThemedText>
            </Pressable>
            <Pressable onPress={loadDemoData}>
              <ThemedText type="mono" themeColor="textSecondary">
                [ or load a demo fridge ]
              </ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item: row }) =>
          row.type === 'heading' ? (
            <ThemedText type="mono" themeColor="textSecondary" style={styles.heading}>
              {row.text}
            </ThemedText>
          ) : (
            <FridgeItem
              item={row.item}
              now={now}
              expanded={expandedId === row.item.id}
              onToggle={() => setExpandedId(expandedId === row.item.id ? null : row.item.id)}
            />
          )
        }
      />
      <Pressable
        onPress={() => router.push('/add-item')}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.text, bottom: 20, opacity: pressed ? 0.8 : 1 }]}>
        <ThemedText type="mono" style={{ color: theme.background, fontWeight: 700, fontSize: 16 }}>
          + add
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 8 },
  top: { gap: 12, paddingTop: 8, paddingBottom: 4 },
  headerBlock: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  headerInfo: { flex: 1, gap: 2 },
  tiny: { fontSize: 12, lineHeight: 16 },
  bubble: { borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  card: { borderWidth: 1.5, borderRadius: 6, padding: 12, gap: 8 },
  branch: { flex: 1, gap: 2 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challenge: { gap: 2 },
  heading: { marginTop: 8, fontSize: 12 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32, paddingHorizontal: 24 },
  itemBlock: { gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  small: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  swipeAction: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 6 },
  fab: { position: 'absolute', right: 16, borderRadius: 6, paddingHorizontal: 18, paddingVertical: 12 },
});
