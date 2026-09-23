import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORIES } from '@/lib/categories';
import { daysUntil } from '@/lib/rules/dates';
import { urgencyOf, type Urgency } from '@/lib/rules/urgency';
import type { Item } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

function expiryLabel(days: number): string {
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days < 60) return `${days} days left`;
  return `${Math.round(days / 30)} months left`;
}

export function ItemRow({ item, now, onPress }: { item: Item; now: Date; onPress: () => void }) {
  const theme = useTheme();
  const urgency = urgencyOf(item, now);
  const accent: Record<Urgency, string> = {
    expired: theme.danger,
    today: theme.danger,
    soon: theme.warning,
    'this-week': theme.textSecondary,
    fine: theme.tint,
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.stripe, { backgroundColor: accent[urgency] }]} />
      <View style={styles.main}>
        <ThemedText numberOfLines={1}>
          {item.name}
          {item.quantity > 1 ? <ThemedText themeColor="textSecondary"> × {item.quantity}</ThemedText> : null}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {CATEGORIES[item.category].label}
          {item.opened ? ' · opened' : ''}
        </ThemedText>
      </View>
      <ThemedText type="mono" style={{ color: accent[urgency], fontWeight: 700 }}>
        {expiryLabel(daysUntil(item.expiresAt, now))}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, borderWidth: 1.5, overflow: 'hidden', gap: 12, paddingRight: 12 },
  stripe: { width: 6, alignSelf: 'stretch' },
  main: { flex: 1, paddingVertical: 12 },
});
