import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { ItemRow } from '@/components/item-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { creatureMood, lifetimeImpact, type CreatureMood } from '@/lib/rules/creature';
import { countUnits, estimateMeals, findDonationCandidates } from '@/lib/rules/surplus';
import { findRescueCandidates, sortByUrgency } from '@/lib/rules/urgency';
import type { Item } from '@/lib/types';
import { useItems } from '@/store/items';

const MOOD_LINE: Record<CreatureMood, string> = {
  celebrating: 'You donated food — Sprout is glowing!',
  thriving: 'Sprout is thriving on everything you rescued.',
  content: 'Sprout is content. Keep an eye on the dates.',
  hungry: 'Sprout is hungry — something needs rescuing.',
  wilting: 'Sprout is wilting. Food went to waste this week.',
};

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
  const { setStatus, setOpened, removeItem } = useItems();
  const run = (fn: () => void) => () => {
    fn();
    onDone();
  };
  return (
    <View style={styles.actions}>
      <ActionButton label="Used it" color={theme.tint} onPress={run(() => setStatus(item.id, 'used'))} />
      <ActionButton
        label={item.opened ? 'Mark unopened' : 'Mark opened'}
        color={theme.textSecondary}
        onPress={run(() => setOpened(item.id, !item.opened))}
      />
      <ActionButton label="Binned it" color={theme.danger} onPress={run(() => setStatus(item.id, 'wasted'))} />
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
    <View style={styles.branches}>
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

function Header({ items, now }: { items: Item[]; now: Date }) {
  const theme = useTheme();
  const mood = creatureMood(items, now);
  const impact = lifetimeImpact(items);
  return (
    <View style={styles.header}>
      <Creature mood={mood} />
      <ThemedText style={styles.moodLine}>{MOOD_LINE[mood]}</ThemedText>
      <View style={[styles.counters, { backgroundColor: theme.backgroundElement }]}>
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
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
        ListHeaderComponent={<Header items={items} now={now} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, gap: 12 },
  moodLine: { textAlign: 'center' },
  counters: { flexDirection: 'row', borderRadius: 16, paddingVertical: 10, alignSelf: 'stretch' },
  counter: { flex: 1, alignItems: 'center' },
  divider: { width: 1, marginVertical: 6 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32, paddingHorizontal: 24 },
  itemBlock: { gap: 6 },
  branches: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  branch: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 4 },
  action: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
  },
});
