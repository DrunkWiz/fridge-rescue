import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { initPurchases } from '@/lib/purchases';
import { useItems } from '@/store/items';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrated = useItems.persist.hasHydrated();

  useEffect(() => {
    initPurchases();
  }, []);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
    return useItems.persist.onFinishHydration(() => SplashScreen.hideAsync());
  }, [hydrated]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Fridge Rescue' }} />
        <Stack.Screen name="add-item" options={{ title: 'Add item', presentation: 'modal' }} />
        <Stack.Screen name="rescue" options={{ title: 'Rescue' }} />
        <Stack.Screen name="donate" options={{ title: 'Donation box' }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
