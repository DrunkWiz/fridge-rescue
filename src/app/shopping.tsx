import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES } from '@/lib/categories';
import { addDays, daysUntil } from '@/lib/rules/dates';
import { formatShareList, guessCategory, matchingItems, parseList } from '@/lib/rules/lists';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';
import { useShopping, type ShoppingEntry } from '@/store/shopping';

function when(days: number): string {
  if (days < 0) return 'past its date';
  if (days === 0) return 'expires today';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} left`;
  return `${Math.round(days / 30)} months left`;
}

/** Ticking an entry means "bought it": it moves into the fridge with a guessed date. Undo puts both back. */
function bought(entry: ShoppingEntry) {
  const shopping = useShopping.getState();
  const items = useItems.getState();
  const previousEntries = shopping.entries;
  const previousItems = items.items;
  const category = guessCategory(entry.name);
  const days = CATEGORIES[category].defaultShelfLifeDays;
  items.addItem({
    name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
    category,
    quantity: entry.quantity,
    expiresAt: addDays(new Date(), days).toISOString(),
  });
  shopping.remove(entry.id);
  useGame.getState().showMoment({
    kind: 'toast',
    text: `${entry.name.toLowerCase()} → fridge · ${days} days`,
    undo: previousItems,
    undoFn: () => useShopping.getState().restore(previousEntries),
  });
}

function EntryRow({ entry }: { entry: ShoppingEntry }) {
  const theme = useTheme();
  const items = useItems((s) => s.items);
  const remove = useShopping((s) => s.remove);
  const have = matchingItems(entry.name, items);
  const haveQty = have.reduce((n, i) => n + i.quantity, 0);
  // Say what matched when it isn't the same name ("milk" → oat milk).
  const names = [...new Set(have.map((i) => i.name.toLowerCase()))];
  const matched = names.some((n) => n !== entry.name.toLowerCase()) ? ` (${names.join(', ')})` : '';
  const soonest = have.length ? Math.min(...have.map((i) => daysUntil(i.expiresAt, new Date()))) : null;

  return (
    <View style={[styles.row, { borderColor: haveQty ? theme.warning : theme.border }]}>
      <Pressable
        onPress={() => bought(entry)}
        accessibilityRole="checkbox"
        accessibilityLabel={`Bought ${entry.name}`}
        hitSlop={8}
        style={[styles.checkbox, { borderColor: theme.text }]}
      />
      <View style={{ flex: 1 }}>
        <ThemedText>
          {entry.quantity > 1 ? `${entry.quantity} × ` : ''}
          {entry.name}
        </ThemedText>
        {haveQty > 0 && soonest !== null && (
          <ThemedText type="small" style={{ color: theme.warning }}>
            you already have {haveQty}{matched} · {when(soonest)}
          </ThemedText>
        )}
      </View>
      <Pressable onPress={() => remove(entry.id)} hitSlop={10} accessibilityLabel={`Remove ${entry.name}`}>
        <ThemedText type="mono" themeColor="textSecondary">
          ✕
        </ThemedText>
      </Pressable>
    </View>
  );
}

/** The household shopping list: stops double-buying, and bought things flow straight into the fridge. */
export default function ShoppingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const entries = useShopping((s) => s.entries);
  const add = useShopping((s) => s.add);
  const clear = useShopping((s) => s.clear);
  const [text, setText] = useState('');
  const [pasting, setPasting] = useState(false);

  const submit = () => {
    const lines = parseList(text);
    if (lines.length === 0) return;
    add(lines);
    setText('');
    setPasting(false);
  };

  const share = async () => {
    try {
      await Share.share({ message: formatShareList(entries.map((e) => ({ name: e.name, quantity: e.quantity }))) });
    } catch {
      // Browsers without the Share API reject; nothing else to do.
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={pasting ? 'paste the list from your family chat' : 'add something… (e.g. 2 x milk)'}
            placeholderTextColor={theme.textSecondary}
            multiline={pasting}
            onSubmitEditing={pasting ? undefined : submit}
            returnKeyType="done"
            textAlignVertical="top"
            style={[styles.input, pasting && styles.pasteInput, { color: theme.text, borderColor: theme.border }]}
          />
          {!pasting && <Button label="add" onPress={submit} disabled={!text.trim()} style={styles.addButton} />}
        </View>
        {pasting ? (
          <Button label="Add these to the list" onPress={submit} disabled={!text.trim()} />
        ) : (
          <Pressable onPress={() => setPasting(true)} hitSlop={6}>
            <ThemedText type="mono" style={[styles.tiny, { color: theme.tint }]}>
              got a list from someone? paste it →
            </ThemedText>
          </Pressable>
        )}

        {entries.length === 0 ? (
          <ThemedText type="mono" themeColor="textSecondary" style={styles.empty}>
            nothing on the list. add things as they run out — tap an item in your fridge and choose &quot;+ list&quot;.
          </ThemedText>
        ) : (
          <>
            <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
              tick when bought — it goes straight into your fridge
            </ThemedText>
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
            <Button label="Share with family 💬" onPress={share} style={styles.share} />
            <Pressable onPress={clear} hitSlop={6} style={styles.clear}>
              <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
                clear list
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  pasteInput: { minHeight: 160 },
  addButton: { minHeight: 0, paddingVertical: 10, paddingHorizontal: 16 },
  tiny: { fontSize: 12, lineHeight: 16 },
  empty: { textAlign: 'center', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 6, padding: 12 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 2 },
  share: { marginTop: 8 },
  clear: { alignSelf: 'center', padding: 6 },
});
