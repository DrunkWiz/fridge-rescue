import { useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Wider than any phone in portrait: the demo is being viewed in a desktop window. */
const DESKTOP_MIN_WIDTH = 700;
const DISMISSED_KEY = 'fridge-rescue:phone-hint-dismissed';

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

// The static export renders with no window, so the server snapshot is "narrow" and the tip only
// appears after hydration (no mismatch).
const isWide = () => window.innerWidth >= DESKTOP_MIN_WIDTH;

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Fridge Rescue is a phone app; stretched across a desktop browser it looks nothing like it does
 * in the hand. Suggest the browser's device toolbar (or a real phone) until the viewer dismisses it.
 */
export function PhoneLayoutHint() {
  const theme = useTheme();
  const wide = useSyncExternalStore(subscribe, isWide, () => false);
  const [dismissed, setDismissed] = useState(() => typeof window !== 'undefined' && wasDismissed());

  if (!wide || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private windows can block storage; the tip just comes back next visit.
    }
  };

  return (
    <View
      accessibilityRole="alert"
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          📱 best viewed as a phone
        </ThemedText>
        <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss tip" hitSlop={10}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            ✕
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small">
        Fridge Rescue is a mobile app. For the real feel, switch to a phone layout: press F12, then Ctrl+Shift+M
        (Cmd+Option+M on a Mac) and pick a phone such as iPhone 14 Pro. Or open this page on your phone.
      </ThemedText>
      <Pressable onPress={dismiss} accessibilityRole="button" style={styles.gotIt}>
        <ThemedText type="smallBold" themeColor="tint">
          got it
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 340,
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    zIndex: 1000,
    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'monospace' },
  gotIt: { alignSelf: 'flex-end' },
});
