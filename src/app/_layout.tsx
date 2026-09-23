import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CelebrationOverlay } from '@/components/celebration';
import { Fonts } from '@/constants/theme';
import { ensureNotificationPermission, rescheduleExpiryReminders } from '@/lib/notifications';
import { initPurchases } from '@/lib/purchases';
import { useItems } from '@/store/items';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrated = useItems.persist.hasHydrated();

  useEffect(() => {
    initPurchases();
  }, []);

  // Keep expiry reminders in sync with the fridge. Permission is asked once there's something to remind about.
  const items = useItems((s) => s.items);
  const hasItems = items.length > 0;
  useEffect(() => {
    if (hasItems) ensureNotificationPermission();
  }, [hasItems]);
  useEffect(() => {
    rescheduleExpiryReminders(items).catch((error) => console.warn('Could not schedule reminders', error));
  }, [items]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
    return useItems.persist.onFinishHydration(() => SplashScreen.hideAsync());
  }, [hydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitleStyle: { fontFamily: Fonts.mono }, headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-item" options={{ title: 'Add item', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: 'scan receipt', presentation: 'modal' }} />
        <Stack.Screen name="rescue" options={{ title: 'Rescue' }} />
        <Stack.Screen name="donate" options={{ title: 'Donation box' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin', presentation: 'modal' }} />
      </Stack>
      {/* Celebrations can be triggered from any screen, so they live above the navigator. */}
      <CelebrationOverlay />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
