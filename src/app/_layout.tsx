import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useItems } from '@/store/items';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrated = useItems.persist.hasHydrated();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
    return useItems.persist.onFinishHydration(() => SplashScreen.hideAsync());
  }, [hydrated]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Fridge Rescue' }} />
        <Stack.Screen name="add-item" options={{ title: 'Add item', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
