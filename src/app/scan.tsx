import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ReviewRow, toReviewItems, type ReviewItem } from '@/components/review-row';
import { Creature } from '@/components/creature/creature';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { hasAnthropicKey } from '@/lib/api/claude';
import { sampleScan, scanGroceries, type ImageMediaType } from '@/lib/api/scan';
import { useIsPro } from '@/lib/purchases';
import { addDays } from '@/lib/rules/dates';
import { FREE_SCANS_PER_MONTH, useFreeScansLeft, useGame } from '@/store/game';
import { useItems } from '@/store/items';


/** The API accepts images up to 5 MB; phone photos are re-encoded well under that. */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.5, exif: false };

function mediaTypeOf(asset: ImagePicker.ImagePickerAsset): ImageMediaType {
  const t = asset.mimeType ?? '';
  return t === 'image/png' || t === 'image/webp' || t === 'image/gif' ? t : 'image/jpeg';
}

export default function ScanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const equipped = useGame((s) => s.equipped);
  const addItems = useItems((s) => s.addItems);
  const recordScan = useGame((s) => s.recordScan);
  const freeLeft = useFreeScansLeft();

  const [status, setStatus] = useState<'idle' | 'reading' | 'review'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewItem[]>([]);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    if (source === 'camera') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        setError('camera access was declined. you can pick a photo instead.');
        return;
      }
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    setStatus('reading');
    try {
      const items = await scanGroceries(asset.base64, mediaTypeOf(asset));
      recordScan();
      if (items.length === 0) {
        setStatus('idle');
        setError("sprout couldn't find any food in that photo. try a clearer shot of the receipt.");
        return;
      }
      setRows(toReviewItems(items));
      setStatus('review');
    } catch (e) {
      console.warn('Scan failed', e);
      setStatus('idle');
      setError('the scan failed. check your connection and try again.');
    }
  };

  const chosen = rows.filter((r) => r.include && r.name.trim());
  const save = () => {
    const now = new Date();
    addItems(
      chosen.map((r) => ({ name: r.name, category: r.category, quantity: r.quantity, expiresAt: addDays(now, r.daysUntilExpiry).toISOString() })),
    );
    router.dismissAll();
  };

  // Free users get a few scans a month so the easy path isn't paywalled; Pro is unlimited.
  if (!isPro && freeLeft === 0 && status === 'idle') {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Creature mood="content" equipped={equipped} />
        <ThemedText type="mono" style={styles.center}>
          you&apos;ve used your {FREE_SCANS_PER_MONTH} free scans this month.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Pro scans are unlimited. Adding items by hand or barcode is always free.
        </ThemedText>
        <Button label="See Pro" onPress={() => router.push('/paywall')} style={styles.wide} />
      </ThemedView>
    );
  }

  const loadSample = () => {
    setRows(toReviewItems(sampleScan()));
    setStatus('review');
  };

  if (!hasAnthropicKey && status === 'idle') {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Creature mood="content" equipped={equipped} />
        <ThemedText type="mono" style={styles.center}>
          photo scanning needs an Anthropic API key in .env (see the README).
        </ThemedText>
        <Button label="Try a sample receipt (demo)" variant="outline" onPress={loadSample} style={styles.wide} />
      </ThemedView>
    );
  }

  if (status === 'reading') {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Creature mood="hungry" equipped={equipped} />
        <ThemedText type="mono" style={styles.center}>
          sprout is reading your receipt…
        </ThemedText>
        <ActivityIndicator color={theme.text} />
      </ThemedView>
    );
  }

  if (status === 'review') {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          <ThemedText type="mono">
            found {rows.length} item{rows.length === 1 ? '' : 's'}. untick anything wrong; tap a category to change it. days = until it expires.
          </ThemedText>
          {rows.map((row) => (
            <ReviewRow key={row.key} row={row} onChange={(next) => setRows((rs) => rs.map((r) => (r.key === row.key ? next : r)))} />
          ))}
          <Button label="Scan another photo" variant="outline" onPress={() => setStatus('idle')} />
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background, borderColor: theme.border }]}>
          <Button label={`Add ${chosen.length} item${chosen.length === 1 ? '' : 's'} to fridge`} onPress={save} disabled={chosen.length === 0} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.centered]}>
      <Creature mood="content" equipped={equipped} />
      <ThemedText type="mono" style={styles.center}>
        photograph a receipt, or your shopping laid out on the table.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Sprout lists every food item with a best-guess use-by date. You check it before anything is added.
      </ThemedText>
      {!isPro && (
        <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
          {freeLeft} of {FREE_SCANS_PER_MONTH} free scans left this month
        </ThemedText>
      )}
      <Button label="Take a photo" onPress={() => pick('camera')} style={styles.wide} />
      <Button label="Choose from photos" variant="outline" onPress={() => pick('library')} style={styles.wide} />
      {error && (
        <ThemedText type="mono" style={[styles.center, { color: theme.danger }]}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  center: { textAlign: 'center' },
  wide: { alignSelf: 'stretch' },
  content: { padding: 16, gap: 10 },
  tiny: { fontSize: 12, lineHeight: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1.5 },
});
