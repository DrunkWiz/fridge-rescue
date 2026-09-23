import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { buildAccessory, palette } from '@/components/creature/sprites';
import { PixelGrid } from '@/components/pixel-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useIsPro } from '@/lib/purchases';
import { creatureMood } from '@/lib/rules/creature';
import {
  ACCESSORIES,
  growth,
  SEEDS_PER_CHECK_IN,
  SEEDS_PER_DONATED_UNIT,
  SEEDS_PER_RESCUED_UNIT,
  SHOP,
  totalXp,
  type Accessory,
} from '@/lib/rules/progress';
import { useGame, useSeedBalance } from '@/store/game';
import { useItems } from '@/store/items';

const ITEM_PALETTE = palette('content');

function ShopItem({ item, balance }: { item: Accessory; balance: number }) {
  const theme = useTheme();
  const bought = useGame((s) => s.bought.includes(item.id));
  const wearing = useGame((s) => s.equipped[item.slot] === item.id);
  const buy = useGame((s) => s.buy);
  const toggle = useGame((s) => s.toggleAccessory);
  const isPro = useIsPro();

  const proLocked = item.proOnly && !isPro;
  const affordable = item.price !== undefined && balance >= item.price;

  const onPress = () => {
    if (proLocked) router.push('/paywall');
    else if (bought || item.proOnly) toggle(item.id);
    else if (affordable) buy(item.id);
  };

  const label = proLocked
    ? 'PRO'
    : bought || item.proOnly
      ? wearing
        ? 'wearing'
        : 'wear'
      : `🌱 ${item.price}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${label}`}
      style={({ pressed }) => [
        styles.item,
        {
          borderColor: wearing ? theme.tint : theme.border,
          backgroundColor: theme.background,
          opacity: pressed ? 0.7 : !bought && !item.proOnly && !affordable ? 0.45 : 1,
        },
      ]}>
      <View style={styles.preview}>
        <PixelGrid grid={buildAccessory(item.id)} palette={ITEM_PALETTE} pixel={5} />
      </View>
      <ThemedText type="mono" style={styles.center} numberOfLines={1}>
        {item.name.toLowerCase()}
      </ThemedText>
      <ThemedText type="mono" style={[styles.center, { fontWeight: 700, color: wearing ? theme.tint : theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function ShopScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const equipped = useGame((s) => s.equipped);
  const balance = useSeedBalance();

  const stock = [...SHOP, ...Object.values(ACCESSORIES).filter((a) => a.proOnly)];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Creature mood={creatureMood(items, new Date())} level={growth(totalXp(items)).stage.level} equipped={equipped} />
          <View style={[styles.balance, { borderColor: theme.border }]}>
            <ThemedText type="monoLarge">🌱 {balance}</ThemedText>
            <ThemedText type="mono" themeColor="textSecondary">
              seeds
            </ThemedText>
          </View>
        </View>

        <ThemedText type="mono" themeColor="textSecondary">
          earn seeds: +{SEEDS_PER_RESCUED_UNIT} per item rescued · +{SEEDS_PER_DONATED_UNIT} per item donated · +{SEEDS_PER_CHECK_IN} daily
          fridge check · +10 per badge. seeds can&apos;t be bought.
        </ThemedText>

        <View style={styles.grid}>
          {stock.map((item) => (
            <ShopItem key={item.id} item={item} balance={balance} />
          ))}
        </View>

        <ThemedText type="mono" themeColor="textSecondary" style={styles.center}>
          more outfits come from badges → sprout tab
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  balance: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', marginRight: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: '31%', borderWidth: 1.5, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  preview: { height: 56, justifyContent: 'center' },
  center: { textAlign: 'center' },
});
