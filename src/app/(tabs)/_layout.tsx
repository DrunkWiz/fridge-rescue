import { Redirect, router, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';

import { PixelIcon, type PixelIconName } from '@/components/pixel-icons';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProSource } from '@/lib/purchases';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

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
        {source === 'purchase' ? 'PRO ✓' : source === 'admin' ? 'ADMIN' : 'GO PRO'}
      </ThemedText>
    </Pressable>
  );
}

const tab = (title: string, icon: PixelIconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <PixelIcon name={icon} color={String(color)} />,
});

/** True once the game store has loaded from storage (so we don't flash the intro at returning users). */
function useGameHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useGame.persist.hasHydrated());
  useEffect(() => useGame.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

export default function TabsLayout() {
  const theme = useTheme();
  const hydrated = useGameHydrated();
  const onboarded = useGame((s) => s.onboarded);
  const hasItems = useItems((s) => s.items.length > 0);

  // New users get the three-screen intro; anyone who already has food is treated as onboarded.
  if (hydrated && !onboarded && !hasItems) return <Redirect href="/welcome" />;

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
