import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ADMIN_CODE, useProSource, useProState } from '@/lib/purchases';

/** Admin mode for judges: Pro on and every outfit unlocked, no purchase needed. Linked from the Impact tab. */
export default function AdminScreen() {
  const theme = useTheme();
  const source = useProSource();
  const admin = useProState((s) => s.adminOverride);
  const unlockAdmin = useProState((s) => s.unlockAdmin);
  const clearAdmin = useProState((s) => s.clearAdmin);
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (unlockAdmin(key)) router.back();
    else setError(`That's not it. The code is "${ADMIN_CODE}".`);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="mono">
        admin mode:{' '}
        <ThemedText type="mono" style={{ color: admin ? theme.warning : theme.textSecondary, fontWeight: 700 }}>
          {admin ? 'on' : 'off'}
        </ThemedText>
        {source === 'purchase' ? '  ·  pro: purchased ✓' : ''}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        For judges and testing. Turns on every Pro feature and unlocks every outfit for Sprout (badge rewards, shop
        items, seasonal ones), all free to put on and swap. Nothing is charged.
      </ThemedText>

      {admin ? (
        <Button label="Turn off admin mode" variant="outline" onPress={clearAdmin} />
      ) : (
        <>
          <ThemedText type="mono">
            code: <ThemedText type="mono" style={{ fontWeight: 700 }}>{ADMIN_CODE}</ThemedText>
          </ThemedText>
          <TextInput
            value={key}
            onChangeText={(text) => {
              setKey(text);
              setError(null);
            }}
            placeholder="type the code"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {error && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          )}
          <Button label="Turn on admin mode" onPress={submit} disabled={!key.trim()} />
        </>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        To see the real purchase flow instead, tap GO PRO. It uses RevenueCat&apos;s Test Store, so no real money moves.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 14 },
  input: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
