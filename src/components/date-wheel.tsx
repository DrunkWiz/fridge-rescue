import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { daysInMonth, formatDayMonthYear, MONTHS } from '@/lib/rules/dates';

const ROW = 44;
const VISIBLE = 5;
/** Padding above and below so the first and last rows can reach the middle. */
const PAD = ROW * Math.floor(VISIBLE / 2);

/**
 * One scrolling column that snaps to a row. The row in the middle band is the
 * value; tapping a row scrolls to it too (handy with a mouse in the browser).
 */
function Wheel({ labels, index, onChange, width }: { labels: string[]; index: number; onChange: (i: number) => void; width: number }) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = useRef(index);

  // Follow outside changes (e.g. day clamped from 31 to 30 when the month changes).
  useEffect(() => {
    if (shown.current !== index) {
      shown.current = index;
      scroller.current?.scrollTo({ y: index * ROW, animated: true });
    }
  }, [index]);

  // Scroll events fire differently on Android, iOS and the web, so settle on a short pause.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const next = Math.max(0, Math.min(labels.length - 1, Math.round(y / ROW)));
      shown.current = next;
      if (Math.abs(y - next * ROW) > 1) scroller.current?.scrollTo({ y: next * ROW, animated: true });
      if (next !== index) onChange(next);
    }, 120);
  };

  return (
    <View style={{ width, height: ROW * VISIBLE }}>
      <View pointerEvents="none" style={[styles.band, { borderColor: theme.text }]} />
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        scrollEventThrottle={32}
        onScroll={onScroll}
        onLayout={() => scroller.current?.scrollTo({ y: index * ROW, animated: false })}
        contentContainerStyle={{ paddingVertical: PAD }}>
        {labels.map((label, i) => (
          <Pressable
            key={label}
            onPress={() => scroller.current?.scrollTo({ y: i * ROW, animated: true })}
            accessibilityRole="button"
            accessibilityState={{ selected: i === index }}
            style={styles.row}>
            <ThemedText
              type="mono"
              style={[styles.label, i === index ? { fontWeight: 700 } : { opacity: Math.abs(i - index) === 1 ? 0.55 : 0.25 }]}>
              {label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type Props = {
  visible: boolean;
  value: Date;
  /** Earliest selectable date (defaults to today); years run from its year. */
  min?: Date;
  years?: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

/** A bottom sheet with day / month / year wheels. Days follow the month: 28–31, leap years included. */
export function DateWheelPicker({ visible, value, min = new Date(), years = 10, title = 'use by', onCancel, onConfirm }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day, setDay] = useState(value.getDate());

  // Start from the current value each time the sheet opens (not on every render: `value` is often a fresh Date).
  const [open, setOpen] = useState(false);
  if (visible !== open) {
    setOpen(visible);
    if (visible) {
      setYear(value.getFullYear());
      setMonth(value.getMonth());
      setDay(value.getDate());
    }
  }

  const firstYear = Math.min(min.getFullYear(), value.getFullYear());
  const yearLabels = Array.from({ length: years + 1 }, (_, i) => String(firstYear + i));
  const dayCount = daysInMonth(year, month);
  const safeDay = Math.min(day, dayCount);
  const dayLabels = Array.from({ length: dayCount }, (_, i) => String(i + 1));

  const picked = new Date(year, month, safeDay);
  const floor = new Date(min.getFullYear(), min.getMonth(), min.getDate());
  const tooEarly = picked < floor;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close date picker" />
      <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border, paddingBottom: insets.bottom + 16 }]}>
        <ThemedText type="mono" style={styles.title}>
          {title}: {formatDayMonthYear(picked)}
        </ThemedText>
        <View style={styles.wheels}>
          <Wheel labels={dayLabels} index={safeDay - 1} onChange={(i) => setDay(i + 1)} width={64} />
          <Wheel labels={MONTHS} index={month} onChange={setMonth} width={80} />
          <Wheel labels={yearLabels} index={year - firstYear} onChange={(i) => setYear(firstYear + i)} width={88} />
        </View>
        {tooEarly && (
          <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
            That&apos;s in the past — pick today or later.
          </ThemedText>
        )}
        <View style={styles.buttons}>
          <Button label="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
          <Button label="Set date" onPress={() => onConfirm(picked)} disabled={tooEarly} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopWidth: 1.5, borderTopLeftRadius: 10, borderTopRightRadius: 10, padding: 16, gap: 12 },
  title: { textAlign: 'center', fontWeight: 700 },
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  band: { position: 'absolute', left: 0, right: 0, top: PAD, height: ROW, borderTopWidth: 1.5, borderBottomWidth: 1.5 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18 },
  buttons: { flexDirection: 'row', gap: 10 },
});
