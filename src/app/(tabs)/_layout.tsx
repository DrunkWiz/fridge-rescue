import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';

import { PixelIcon, type PixelIconName } from '@/components/pixel-icons';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProSource } from '@/lib/purchases';

function ProPill() {
  const theme = useTheme();
  const source = useProSource();
  const color = source === 'admin' ? theme.warning : theme.tint;
  return (
    <Pressable
      onPress={() => router.push('/paywall')}
      onLongPress={() => router.push('/admin')}
      accessibilityRole="button"
      style={[styles.pill, { borderColor: color }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
        {source === 'purchase' ? 'PRO ✓' : source === 'admin' ? 'PRO (admin)' : 'GO PRO'}
      </ThemedText>
    </Pressable>
  );
}

const tab = (title: string, icon: PixelIconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <PixelIcon name={icon} color={String(color)} />,
});

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontFamily: Fonts.mono, fontWeight: 700 },
        headerShadowVisible: false,
        headerRight: () => <ProPill />,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontFamily: Fonts.mono, fontSize: 11 },
        tabBarStyle: { borderTopColor: theme.border, borderTopWidth: 1.5 },
      }}>
      <Tabs.Screen name="index" options={{ ...tab('fridge', 'fridge'), headerTitle: 'fridge rescue' }} />
      <Tabs.Screen name="sprout" options={tab('sprout', 'sprout')} />
      <Tabs.Screen name="shop" options={tab('shop', 'shop')} />
      <Tabs.Screen name="impact" options={tab('impact', 'impact')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginRight: 12 },
});
