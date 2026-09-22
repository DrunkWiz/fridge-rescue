import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * Full-screen camera scanner with a type-it-in fallback for when the camera
 * is unavailable, permission is declined, or the barcode won't read.
 */
export function BarcodeScanner({ visible, onClose, onScanned }: { visible: boolean; onClose: () => void; onScanned: (code: string) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const handled = useRef(false);

  const finish = (code: string) => {
    if (handled.current) return;
    handled.current = true;
    onScanned(code);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => (handled.current = false)}>
      <ThemedView style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <ThemedText type="smallBold" style={styles.title}>
          Scan a barcode
        </ThemedText>

        <View style={[styles.cameraBox, { backgroundColor: theme.backgroundElement }]}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
              onBarcodeScanned={({ data }) => finish(data)}
            />
          ) : (
            <View style={styles.permission}>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {permission?.canAskAgain === false
                  ? 'Camera access is off for this app. You can type the number instead.'
                  : 'Point your camera at the barcode on the pack.'}
              </ThemedText>
              {permission?.canAskAgain !== false && <Button label="Allow camera" onPress={requestPermission} />}
            </View>
          )}
        </View>

        <View style={styles.manual}>
          <TextInput
            value={typed}
            onChangeText={(t) => setTyped(t.replace(/\D/g, ''))}
            placeholder="…or type the number"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <Button label="Look up" variant="outline" onPress={() => finish(typed)} disabled={typed.length < 8} />
        </View>
        <Button label="Cancel" variant="outline" onPress={onClose} />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 12 },
  title: { textAlign: 'center', fontSize: 18 },
  cameraBox: { flex: 1, borderRadius: 20, overflow: 'hidden', justifyContent: 'center' },
  permission: { padding: 24, gap: 12, alignItems: 'stretch' },
  manual: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
