import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** A selectable list row: tick box, title, subtitle, and an optional trailing slot. */
export function CheckRow({
  checked,
  onToggle,
  title,
  subtitle,
  trailing,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.row, { borderColor: theme.border }]}>
      <View style={[styles.box, { borderColor: checked ? theme.tint : theme.textSecondary, backgroundColor: checked ? theme.tint : 'transparent' }]}>
        {checked && <ThemedText style={{ color: theme.onTint, fontSize: 14, lineHeight: 16 }}>✓</ThemedText>}
      </View>
      <View style={styles.main}>
        <ThemedText numberOfLines={1}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1 },
});
