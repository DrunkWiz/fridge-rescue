import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { adminBypassAvailable, useProSource, useProState } from '@/lib/purchases';

/** Hidden testing screen (long-press the Pro pill on Home). Development builds only. */
export default function AdminScreen() {
  const theme = useTheme();
  const source = useProSource();
  const unlockAdmin = useProState((s) => s.unlockAdmin);
  const clearAdmin = useProState((s) => s.clearAdmin);
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!adminBypassAvailable) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText themeColor="textSecondary">
          Admin bypass is only available in development builds with EXPO_PUBLIC_ADMIN_PRO_KEY set.
        </ThemedText>
      </ThemedView>
    );
  }

  const submit = () => {
    if (unlockAdmin(key)) router.back();
    else setError('That key does not match.');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText>
        Pro status:{' '}
        <ThemedText type="smallBold" style={{ color: theme.tint }}>
          {source === 'purchase' ? 'active (purchased)' : source === 'admin' ? 'active (admin override)' : 'not active'}
        </ThemedText>
      </ThemedText>

      {source === 'admin' ? (
        <Button label="Turn off admin override" variant="outline" onPress={clearAdmin} />
      ) : (
        <>
          <TextInput
            value={key}
            onChangeText={(text) => {
              setKey(text);
              setError(null);
            }}
            placeholder="Admin key"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          {error && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          )}
          <Button label="Unlock Pro for testing" onPress={submit} disabled={!key.trim()} />
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        The override only works in development builds. Release builds ignore it, so Pro there always comes from a real
        RevenueCat purchase.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
