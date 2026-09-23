import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { checkShoppingList, type ShoppingCheck } from '@/lib/rules/lists';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

function when(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return 'already past its date';
  if (days === 0) return 'expires today';
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} left`;
  return `${Math.round(days / 30)} months left`;
}

function Result({ check }: { check: ShoppingCheck }) {
  const theme = useTheme();
  const have = check.haveQuantity > 0;
  // Say what matched when it isn't obvious ("milk" → oat milk).
  const names = [...new Set(check.have.map((i) => i.name.toLowerCase()))];
  const matched = names.some((n) => n !== check.line.name.toLowerCase()) ? names.join(', ') : '';
  return (
    <View style={[styles.row, { borderColor: have ? theme.warning : theme.backgroundSelected }]}>
      <ThemedText type="mono" style={{ color: have ? theme.warning : theme.textSecondary, fontWeight: 700 }}>
        {have ? '!' : '✓'}
      </ThemedText>
      <View style={{ flex: 1 }}>
        <ThemedText>
          {check.line.quantity > 1 ? `${check.line.quantity} × ` : ''}
          {check.line.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {have ? `you already have ${check.haveQuantity}${matched ? ` (${matched})` : ''} · ${when(check.soonestDays)}` : 'not in your fridge — go ahead'}
        </ThemedText>
      </View>
    </View>
  );
}

/** Before the shop: paste your list and see what you already have. Stops surplus at the source. */
export default function ShoppingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const pet = useGame((s) => s.sproutName) || 'sprout';
  const [text, setText] = useState('');
  const [checks, setChecks] = useState<ShoppingCheck[] | null>(null);

  const doubled = (checks ?? []).filter((c) => c.haveQuantity > 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        {!checks ? (
          <>
            <ThemedText type="mono">paste your shopping list. {pet.toLowerCase()} will check what&apos;s already at home.</ThemedText>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={'milk\nchickpeas\npasta\nspinach'}
              placeholderTextColor={theme.textSecondary}
              multiline
              autoFocus
              textAlignVertical="top"
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <Button label="Check my list" onPress={() => setChecks(checkShoppingList(text, items, new Date()))} disabled={!text.trim()} />
          </>
        ) : (
          <>
            <View style={[styles.summary, { borderColor: doubled.length ? theme.warning : theme.tint }]}>
              <ThemedText type="monoLarge" style={{ color: doubled.length ? theme.warning : theme.tint }}>
                {doubled.length ? `skip ${doubled.length}` : 'all clear'}
              </ThemedText>
              <ThemedText type="mono" style={styles.center}>
                {doubled.length
                  ? `you already have ${doubled.length === 1 ? 'one thing' : `${doubled.length} things`} on this list.`
                  : 'nothing on your list is already at home.'}
              </ThemedText>
            </View>
            {checks.map((c, i) => (
              <Result key={`${i}-${c.line.name}`} check={c} />
            ))}
            <Button label="Check another list" variant="outline" onPress={() => setChecks(null)} />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  input: { minHeight: 200, borderWidth: 1.5, borderRadius: 6, padding: 12, fontSize: 16 },
  summary: { borderWidth: 2, borderRadius: 6, padding: 16, alignItems: 'center', gap: 4 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 6, padding: 12 },
});
