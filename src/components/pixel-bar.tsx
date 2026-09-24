import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Retro segmented bar: [■■■■■■■   ]. Segments fill left to right. `slim` drops the brackets for tight spots. */
export function PixelBar({ progress, segments = 12, color, slim = false }: { progress: number; segments?: number; color?: string; slim?: boolean }) {
  const theme = useTheme();
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * segments);
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: segments, now: filled }}>
      {!slim && (
        <ThemedText type="mono" style={styles.bracket}>
          [
        </ThemedText>
      )}
      <View style={[styles.cells, slim && styles.slimCells]}>
        {Array.from({ length: segments }, (_, i) => (
          <View
            key={i}
            style={[
              styles.cell,
              slim && { height: 5, backgroundColor: theme.backgroundSelected },
              i < filled && { backgroundColor: color ?? theme.text },
            ]}
          />
        ))}
      </View>
      {!slim && (
        <ThemedText type="mono" style={styles.bracket}>
          ]
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  bracket: { fontSize: 22, lineHeight: 24 },
  cells: { flex: 1, flexDirection: 'row', gap: 3, paddingHorizontal: 3 },
  cell: { flex: 1, height: 12, backgroundColor: 'transparent' },
  slimCells: { gap: 2, paddingHorizontal: 0 },
});
