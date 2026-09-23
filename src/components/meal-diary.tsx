import { Image } from 'expo-image';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useDiary, type DiaryEntry } from '@/store/diary';

function MealCard({ entry }: { entry: DiaryEntry }) {
  const theme = useTheme();
  const remove = useDiary((s) => s.remove);
  const date = new Date(entry.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  const confirmRemove = () => {
    if (Platform.OS === 'web') return remove(entry.id);
    Alert.alert('Remove from diary?', entry.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove(entry.id) },
    ]);
  };

  return (
    <Pressable onLongPress={confirmRemove} style={[styles.card, { borderColor: theme.border }]} accessibilityHint="Long-press to remove">
      {entry.photoUri ? (
        <Image source={{ uri: entry.photoUri }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.placeholder, { backgroundColor: theme.backgroundElement }]}>
          <Text style={styles.plate}>🍳</Text>
        </View>
      )}
      <View style={styles.caption}>
        <ThemedText type="mono" style={styles.date}>
          {date}
        </ThemedText>
        <ThemedText type="small" numberOfLines={2}>
          {entry.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          saved: {entry.itemNames.join(', ').toLowerCase()}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** Every rescue as a card — a scrapbook of meals that would have been waste. */
export function MealDiary() {
  const entries = useDiary((s) => s.entries);
  return (
    <View style={styles.section}>
      <ThemedText type="mono" style={styles.heading}>
        meal diary · {entries.length}
      </ThemedText>
      {entries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Cook a rescue recipe and it lands here, with a photo if you snap one.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {entries.map((e) => (
            <MealCard key={e.id} entry={e} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  heading: { fontWeight: 700, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', borderWidth: 1.5, borderRadius: 6, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 1 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  plate: { fontSize: 44 },
  caption: { padding: 8, gap: 2 },
  date: { fontSize: 12, lineHeight: 16 },
});
