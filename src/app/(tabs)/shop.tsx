import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Creature } from '@/components/creature/creature';
import { EarnSeeds } from '@/components/earn-seeds';
import { buildAccessory, palette, tilePixel } from '@/components/creature/sprites';
import { PixelGrid } from '@/components/pixel-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useIsAdmin, useIsPro } from '@/lib/purchases';
import { creatureMood } from '@/lib/rules/creature';
import {
  ACCESSORIES,
  growth,
  SHOP,
  SLOTS,
  shopStock,
  totalXp,
  type Accessory,
} from '@/lib/rules/progress';
import { useGame, useSeedBalance } from '@/store/game';
import { useItems } from '@/store/items';

const ITEM_PALETTE = palette('content');

/** Buying takes two taps ("buy? 🌱15" then confirm) so a stray tap never spends seeds. */
function ShopItem({ item, balance, armed, onArm }: { item: Accessory; balance: number; armed: boolean; onArm: (id: string | null) => void }) {
  const theme = useTheme();
  const bought = useGame((s) => s.bought.includes(item.id));
  const wearing = useGame((s) => s.equipped[item.slot] === item.id);
  const buy = useGame((s) => s.buy);
  const toggle = useGame((s) => s.toggleAccessory);
  const isPro = useIsPro();
  // Admin mode (for judges): everything is owned, so every tap just puts it on or takes it off.
  const isAdmin = useIsAdmin();
  const owned = bought || item.proOnly || isAdmin;

  const proLocked = item.proOnly && !isPro;
  const affordable = item.price !== undefined && balance >= item.price;

  const onPress = () => {
    if (proLocked) router.push('/paywall');
    else if (owned) toggle(item.id);
    else if (affordable && armed) {
      buy(item.id);
      onArm(null);
    } else if (affordable) onArm(item.id);
  };

  const label = proLocked
    ? 'PRO'
    : owned
      ? wearing
        ? 'wearing'
        : 'wear'
      : armed
        ? `tap to buy · 🌱${item.price}`
        : `🌱 ${item.price}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${label}`}
      style={({ pressed }) => [
        styles.item,
        {
          borderColor: wearing || armed ? theme.tint : theme.border,
          backgroundColor: theme.background,
          opacity: pressed ? 0.7 : !owned && !affordable ? 0.45 : 1,
        },
      ]}>
      <View style={styles.preview}>
        <PixelGrid grid={buildAccessory(item.id)} palette={ITEM_PALETTE} pixel={tilePixel(item.id, 5)} />
      </View>
      <ThemedText type="mono" style={styles.center} numberOfLines={1}>
        {item.name.toLowerCase()}
      </ThemedText>
      {item.season && !owned && (
        <ThemedText type="mono" style={[styles.center, styles.limited, { color: theme.warning }]} numberOfLines={1}>
          limited · {item.season.name}
        </ThemedText>
      )}
      <ThemedText type="mono" style={[styles.center, { fontWeight: 700, color: wearing || armed ? theme.tint : theme.text }]} numberOfLines={1}>
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
  const [armed, setArmed] = useState<string | null>(null);

  const isAdmin = useIsAdmin();
  // Admin mode shows out-of-season stock too.
  const stock = [...(isAdmin ? SHOP : shopStock(new Date())), ...Object.values(ACCESSORIES).filter((a) => a.proOnly)];

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

        <EarnSeeds />

        {SLOTS.map(({ slot, title }) => {
          const inSlot = stock.filter((a) => a.slot === slot);
          if (inSlot.length === 0) return null;
          return (
            <View key={slot} style={styles.group}>
              <ThemedText type="mono" style={{ fontWeight: 700 }}>
                {title}
              </ThemedText>
              <View style={styles.grid}>
                {inSlot.map((item) => (
                  <ShopItem key={item.id} item={item} balance={balance} armed={armed === item.id} onArm={setArmed} />
                ))}
              </View>
            </View>
          );
        })}

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
  group: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: '31%', borderWidth: 1.5, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  preview: { height: 56, justifyContent: 'center' },
  center: { textAlign: 'center' },
  limited: { fontSize: 10, lineHeight: 14 },
});
