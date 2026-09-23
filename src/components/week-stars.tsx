import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { DayStar } from '@/lib/rules/progress';

const GLYPH = ['☆', '⭐', '🌟'] as const;

/** The last seven days as stars: ☆ nothing, ⭐ checked the fridge, 🌟 saved food. */
export function WeekStars({ days }: { days: DayStar[] }) {
  return (
    <View style={styles.row} accessibilityLabel={`Last 7 days: ${days.map((d) => d.stars).join(', ')} stars`}>
      {days.map((d) => {
        const [y, m, day] = d.day.split('-').map(Number);
        const label = new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'narrow' });
        return (
          <View key={d.day} style={styles.day}>
            <Text style={[styles.star, d.stars === 0 && styles.empty]}>{GLYPH[d.stars]}</Text>
            <ThemedText type="mono" themeColor="textSecondary" style={styles.label}>
              {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  day: { alignItems: 'center', flex: 1 },
  star: { fontSize: 20, lineHeight: 26 },
  empty: { color: '#B5B5AE' },
  label: { fontSize: 11 },
});
