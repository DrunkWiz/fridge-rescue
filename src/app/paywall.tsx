import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { refreshCustomerInfo, usePro } from '@/lib/purchases';

/**
 * RevenueCat's own paywall, configured remotely in the dashboard (offering,
 * packages, copy, layout). Nothing about pricing is hard-coded in the app.
 */
export default function PaywallScreen() {
  const configured = usePro((s) => s.configured);

  const close = async () => {
    await refreshCustomerInfo();
    if (router.canGoBack()) router.back();
  };

  if (!configured) {
    return (
      <ThemedView style={[styles.container, styles.missing]}>
        <ThemedText type="smallBold">Purchases aren&apos;t set up in this build</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Add a RevenueCat Test Store key as EXPO_PUBLIC_REVENUECAT_API_KEY in .env and restart. See the README.
        </ThemedText>
        <Button label="Close" variant="outline" onPress={close} style={{ marginTop: 8, alignSelf: 'stretch' }} />
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        options={{ displayCloseButton: true }}
        onPurchaseCompleted={close}
        onRestoreCompleted={close}
        onDismiss={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
});
