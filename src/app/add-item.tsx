import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { BarcodeScanner } from '@/components/barcode-scanner';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { lookupBarcode } from '@/lib/api/openfoodfacts';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { addDays } from '@/lib/rules/dates';
import type { Category } from '@/lib/types';
import { FREE_ITEM_LIMIT, useIsPro } from '@/lib/purchases';
import { useFreeScansLeft } from '@/store/game';
import { useItems } from '@/store/items';

function Stepper({ value, onChange, min, step = 1 }: { value: number; onChange: (n: number) => void; min: number; step?: number }) {
  const theme = useTheme();
  const button = (label: string, delta: number) => (
    <Pressable
      accessibilityLabel={delta > 0 ? 'Increase' : 'Decrease'}
      onPress={() => onChange(Math.max(min, value + delta))}
      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button('−', -step)}
      <ThemedText style={styles.stepValue}>{value}</ThemedText>
      {button('+', step)}
    </View>
  );
}

export default function AddItemScreen() {
  const theme = useTheme();
  const addItem = useItems((s) => s.addItem);
  const activeCount = useItems((s) => s.items.filter((item) => item.status === 'active').length);
  const isPro = useIsPro();
  const freeScans = useFreeScansLeft();
  const atLimit = !isPro && activeCount >= FREE_ITEM_LIMIT;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('produce');
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(CATEGORIES.produce.defaultShelfLifeDays);
  const [opened, setOpened] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  const expiresAt = addDays(new Date(), days);
  const canSave = name.trim().length > 0;

  const pickCategory = (next: Category) => {
    setCategory(next);
    setDays(CATEGORIES[next].defaultShelfLifeDays);
  };

  const onScanned = async (code: string) => {
    setScanning(false);
    setLookupNote('Looking up…');
    const product = await lookupBarcode(code).catch(() => null);
    if (!product) {
      setLookupNote(`Barcode ${code} isn't in Open Food Facts — type the name instead.`);
      return;
    }
    setName(product.name);
    if (product.category) pickCategory(product.category);
    setLookupNote(product.category ? 'Found it — check the date on the pack.' : 'Found it — pick a category.');
  };

  const save = () => {
    if (!canSave || atLimit) return;
    addItem({ name, category, quantity, expiresAt: expiresAt.toISOString(), opened });
    router.back();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          style={[styles.scanCard, { borderColor: theme.border }]}>
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            📷 scan a receipt or your shopping
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add everything from one photo{isPro ? '' : ` · ${freeScans} free this month`}
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/paste')} accessibilityRole="button" style={[styles.scanCard, { borderColor: theme.border }]}>
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            📝 type or paste a list
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            &quot;milk, eggs, 3 tins tomatoes&quot; or an online order · free
          </ThemedText>
        </Pressable>
        <ThemedText type="mono" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          — or add one item —
        </ThemedText>

        <ThemedText type="smallBold">What is it?</ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Spinach"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />

        <Button label="Scan barcode" variant="outline" onPress={() => setScanning(true)} />
        {lookupNote && (
          <ThemedText type="small" themeColor="textSecondary">
            {lookupNote}
          </ThemedText>
        )}
        <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} onScanned={onScanned} />

        <ThemedText type="smallBold">Category</ThemedText>
        <View style={styles.chips}>
          {CATEGORY_KEYS.map((key) => {
            const selected = key === category;
            return (
              <Pressable
                key={key}
                onPress={() => pickCategory(key)}
                style={[styles.chip, { borderColor: selected ? theme.text : theme.backgroundSelected, backgroundColor: selected ? theme.text : 'transparent' }]}>
                <ThemedText type="mono" style={[{ fontSize: 13 }, selected && { color: theme.background }]}>
                  {CATEGORIES[key].label.toLowerCase()}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">Quantity</ThemedText>
          <Stepper value={quantity} onChange={setQuantity} min={1} />
        </View>

        <View style={styles.rowBetween}>
          <View>
            <ThemedText type="smallBold">Use by</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {expiresAt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </ThemedText>
          </View>
          <Stepper value={days} onChange={setDays} min={0} step={days >= 60 ? 30 : 1} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Days from today. Pre-filled from the category — adjust to match the label.
        </ThemedText>

        <View style={styles.rowBetween}>
          <ThemedText type="smallBold">Already opened</ThemedText>
          <Switch value={opened} onValueChange={setOpened} trackColor={{ true: theme.tint }} />
        </View>

        {atLimit ? (
          <View style={styles.limit}>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              The free plan tracks {FREE_ITEM_LIMIT} items. Rescue or donate something to make room — or go Pro for unlimited.
            </ThemedText>
            <Button label="See Pro" onPress={() => router.push('/paywall')} />
          </View>
        ) : (
          <Button label="Add to fridge" onPress={save} disabled={!canSave} style={styles.save} />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  input: { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 4, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, textAlign: 'center' },
  save: { marginTop: 16 },
  limit: { marginTop: 16, gap: 10 },
  scanCard: { borderWidth: 1.5, borderRadius: 6, padding: 14, gap: 2 },
});
