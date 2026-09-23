import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import type { ScannedItem } from '@/lib/rules/scan';

/** A line on a review screen (scan or paste): editable, and can be unticked. */
export type ReviewItem = ScannedItem & { key: string; include: boolean };

export function toReviewItems(items: ScannedItem[]): ReviewItem[] {
  return items.map((item, i) => ({ ...item, key: `${i}-${item.name}`, include: true }));
}

function MiniStepper({ value, onChange, min, step = 1, suffix = '' }: { value: number; onChange: (n: number) => void; min: number; step?: number; suffix?: string }) {
  const theme = useTheme();
  const btn = (label: string, delta: number) => (
    <Pressable onPress={() => onChange(Math.max(min, value + delta))} style={[styles.stepBtn, { borderColor: theme.border }]} hitSlop={6}>
      <ThemedText type="mono">{label}</ThemedText>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('−', -step)}
      <ThemedText type="mono" style={styles.stepValue}>
        {value}
        {suffix}
      </ThemedText>
      {btn('+', step)}
    </View>
  );
}

export function ReviewRow({ row, onChange }: { row: ReviewItem; onChange: (next: ReviewItem) => void }) {
  const theme = useTheme();
  const nextCategory = () => {
    const i = CATEGORY_KEYS.indexOf(row.category);
    onChange({ ...row, category: CATEGORY_KEYS[(i + 1) % CATEGORY_KEYS.length] });
  };
  return (
    <View style={[styles.row, { borderColor: row.include ? theme.border : theme.backgroundSelected, opacity: row.include ? 1 : 0.5 }]}>
      <View style={styles.rowTop}>
        <Pressable
          onPress={() => onChange({ ...row, include: !row.include })}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: row.include }}
          style={[styles.checkbox, { borderColor: theme.text, backgroundColor: row.include ? theme.text : 'transparent' }]}>
          {row.include && <ThemedText style={{ color: theme.background, fontSize: 13, lineHeight: 16 }}>✓</ThemedText>}
        </Pressable>
        <TextInput
          value={row.name}
          onChangeText={(name) => onChange({ ...row, name })}
          style={[styles.name, { color: theme.text }]}
        />
        <Pressable onPress={nextCategory} style={[styles.chip, { borderColor: theme.border }]} accessibilityHint="Changes the category">
          <ThemedText type="mono" style={styles.tiny}>
            {CATEGORIES[row.category].label.toLowerCase()}
          </ThemedText>
        </Pressable>
      </View>
      <View style={styles.rowBottom}>
        <MiniStepper value={row.quantity} onChange={(quantity) => onChange({ ...row, quantity })} min={1} suffix="×" />
        <MiniStepper
          value={row.daysUntilExpiry}
          onChange={(daysUntilExpiry) => onChange({ ...row, daysUntilExpiry })}
          min={0}
          step={row.daysUntilExpiry >= 60 ? 30 : 1}
          suffix="d"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1.5, borderRadius: 6, padding: 10, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 16, paddingVertical: 2 },
  chip: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tiny: { fontSize: 12, lineHeight: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderWidth: 1.5, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 44, textAlign: 'center' },
});
