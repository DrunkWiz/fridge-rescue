import { memo } from 'react';
import { View } from 'react-native';

/**
 * Renders pixel art from a grid of palette keys. Runs of the same colour in a
 * row are merged into one View, so a 16 × 20 sprite is ~100 views, not 320.
 */
export const PixelGrid = memo(function PixelGrid({
  grid,
  palette,
  pixel,
}: {
  grid: string[][];
  palette: Record<string, string>;
  pixel: number;
}) {
  return (
    <View>
      {grid.map((row, r) => {
        const runs: { color: string | null; length: number }[] = [];
        for (const key of row) {
          const color = key === '.' ? null : (palette[key] ?? null);
          const last = runs[runs.length - 1];
          if (last && last.color === color) last.length++;
          else runs.push({ color, length: 1 });
        }
        return (
          <View key={r} style={{ flexDirection: 'row', height: pixel }}>
            {runs.map((run, i) => (
              <View key={i} style={{ width: run.length * pixel, height: pixel, backgroundColor: run.color ?? 'transparent' }} />
            ))}
          </View>
        );
      })}
    </View>
  );
});
