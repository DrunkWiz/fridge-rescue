import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ReviewRow, toReviewItems, type ReviewItem } from '@/components/review-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { addDays } from '@/lib/rules/dates';
import { itemsFromList } from '@/lib/rules/lists';
import { useItems } from '@/store/items';

/** Type or paste a list ("milk, eggs, 3 tins tomatoes" or an online order) → review → add. No AI needed. */
export default function PasteScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const addItems = useItems((s) => s.addItems);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ReviewItem[] | null>(null);

  const chosen = (rows ?? []).filter((r) => r.include && r.name.trim());

  const save = () => {
    const now = new Date();
    addItems(chosen.map((r) => ({ name: r.name, category: r.category, quantity: r.quantity, expiresAt: addDays(now, r.daysUntilExpiry).toISOString() })));
    router.dismissAll();
  };

  if (rows) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          <ThemedText type="mono">
            {rows.length} item{rows.length === 1 ? '' : 's'}. categories and dates are guesses — tap to fix.
          </ThemedText>
          {rows.map((row) => (
            <ReviewRow key={row.key} row={row} onChange={(next) => setRows((rs) => rs!.map((r) => (r.key === row.key ? next : r)))} />
          ))}
          <Button label="Edit the list" variant="outline" onPress={() => setRows(null)} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background, borderColor: theme.border }]}>
          <Button label={`Add ${chosen.length} item${chosen.length === 1 ? '' : 's'} to fridge`} onPress={save} disabled={chosen.length === 0} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <ThemedText type="mono">one item per line, or separated by commas. quantities like &quot;2 x milk&quot; or &quot;eggs x6&quot; work.</ThemedText>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={'2 x milk\neggs x6\nspinach\n3 tins chopped tomatoes'}
          placeholderTextColor={theme.textSecondary}
          multiline
          autoFocus
          textAlignVertical="top"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <Button label="Read my list" onPress={() => setRows(toReviewItems(itemsFromList(text)))} disabled={!text.trim()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  input: { minHeight: 200, borderWidth: 1.5, borderRadius: 6, padding: 12, fontSize: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1.5 },
});
