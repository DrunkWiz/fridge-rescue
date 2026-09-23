import { router } from 'expo-router';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Creature } from '@/components/creature/creature';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useIsPro } from '@/lib/purchases';
import { creatureMood, lifetimeImpact } from '@/lib/rules/creature';
import { historyToCsv, monthlyHistory, unitsToMeals } from '@/lib/rules/impact';
import { formatMoney } from '@/lib/format';
import { moneySaved } from '@/lib/rules/money';
import { growth, totalXp } from '@/lib/rules/progress';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

async function exportCsv(csv: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fridge-rescue-impact.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: 'Fridge Rescue impact', message: csv });
}

export default function ImpactScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const isPro = useIsPro();
  const equipped = useGame((s) => s.equipped);

  const impact = lifetimeImpact(items);
  const history = monthlyHistory(items);
  const mood = creatureMood(items, new Date());

  const shareText =
    `I've rescued ${impact.mealsRescued} meals from my fridge and donated ${impact.mealsDonated} meals to a food bank with Fridge Rescue. 🌱`;

  const share = async () => {
    try {
      await Share.share({ message: shareText });
    } catch {
      // Web browsers without the Share API reject; nothing useful to do.
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* The shareable card — and the closing shot of the demo video. */}
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Creature mood={mood} level={growth(totalXp(items)).stage.level} equipped={equipped} />
          <View style={styles.counters}>
            <View style={styles.counter}>
              <ThemedText type="monoLarge" style={{ color: theme.tint, fontSize: 40, lineHeight: 48 }}>
                {impact.mealsRescued}
              </ThemedText>
              <ThemedText type="mono" themeColor="textSecondary">
                meals rescued
              </ThemedText>
            </View>
            <View style={styles.counter}>
              <ThemedText type="monoLarge" style={{ color: theme.tint, fontSize: 40, lineHeight: 48 }}>
                {impact.mealsDonated}
              </ThemedText>
              <ThemedText type="mono" themeColor="textSecondary">
                meals donated
              </ThemedText>
            </View>
          </View>
        </View>
        <ThemedText type="mono" style={{ textAlign: 'center' }}>
          💰 {formatMoney(moneySaved(items))} of food kept out of the bin
        </ThemedText>
        <Button label="Share my impact" onPress={share} />

        <ThemedText type="mono" style={[styles.heading, { fontWeight: 700 }]}>
          history
        </ThemedText>

        {!isPro ? (
          <View style={[styles.locked, { borderColor: theme.border }]}>
            <ThemedText style={{ textAlign: 'center' }}>Month-by-month history and CSV export are part of Pro.</ThemedText>
            <Button label="See Pro" variant="outline" onPress={() => router.push('/paywall')} />
          </View>
        ) : history.length === 0 ? (
          <ThemedText themeColor="textSecondary">Nothing yet — rescue or donate something and it shows up here.</ThemedText>
        ) : (
          <>
            {history.map((m) => (
              <View key={m.month} style={[styles.month, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{monthLabel(m.month)}</ThemedText>
                <ThemedText type="small">
                  🍳 {unitsToMeals(m.rescued)} meals rescued · 📦 {unitsToMeals(m.donated)} meals donated
                  {m.wasted > 0 ? ` · 🗑 ${m.wasted} binned` : ''}
                </ThemedText>
                {m.entries
                  .filter((e) => e.status === 'donated' && e.donatedTo)
                  .map((e) => (
                    <ThemedText key={e.id} type="small" themeColor="textSecondary">
                      {e.quantity} × {e.name} → {e.donatedTo}
                    </ThemedText>
                  ))}
              </View>
            ))}
            <Button label="Export CSV" variant="outline" onPress={() => exportCsv(historyToCsv(items))} />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 6, borderWidth: 2, paddingVertical: 24, alignItems: 'center', gap: 16 },
  counters: { flexDirection: 'row', alignSelf: 'stretch' },
  counter: { flex: 1, alignItems: 'center' },
  heading: { marginTop: 12 },
  locked: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 18, gap: 12 },
  month: { borderRadius: 14, padding: 14, gap: 4 },
});
