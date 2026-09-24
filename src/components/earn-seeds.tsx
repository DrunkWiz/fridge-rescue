import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { showRewardedAd } from '@/lib/ads';
import { useIsPro } from '@/lib/purchases';
import {
  rewardsLeft,
  SEED_REWARDS,
  SEEDS_PER_BADGE,
  SEEDS_PER_CHECK_IN,
  SEEDS_PER_DIARY_PHOTO,
  SEEDS_PER_DONATED_UNIT,
  SEEDS_PER_RESCUED_UNIT,
  SEEDS_PER_STAGE,
} from '@/lib/rules/progress';
import { useGame } from '@/store/game';

const AD = SEED_REWARDS.ad;

/** The shop's "earn more" card: an opt-in rewarded ad (Pro skips the ad), plus every other way to earn. */
export function EarnSeeds() {
  const theme = useTheme();
  const isPro = useIsPro();
  const seedLog = useGame((s) => s.seedLog);
  const [busy, setBusy] = useState(false);
  const left = rewardsLeft(seedLog, 'ad', new Date());

  const collect = async () => {
    setBusy(true);
    try {
      const earned = isPro || (await showRewardedAd('shop'));
      if (!earned) return;
      const seeds = useGame.getState().earnSeeds('ad');
      if (seeds) useGame.getState().showMoment({ kind: 'toast', text: `+${seeds} 🌱 ${isPro ? 'pro bonus collected' : 'thanks for watching'}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <ThemedText type="mono" style={{ fontWeight: 700 }}>
            {isPro ? '⭐ pro bonus' : '📺 watch a short ad'} · +{AD.seeds} 🌱
          </ThemedText>
          <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
            {left > 0 ? `${left} of ${AD.limit} left today` : 'all collected today, back tomorrow'}
            {isPro ? ' · no ad for pro' : ' · always optional'}
          </ThemedText>
        </View>
        <Button
          label={busy ? '…' : isPro ? 'collect' : 'watch'}
          variant="outline"
          onPress={collect}
          disabled={busy || left === 0}
          style={styles.button}
        />
      </View>

      <ThemedText type="mono" themeColor="textSecondary" style={styles.tiny}>
        more ways to earn: +{SEEDS_PER_RESCUED_UNIT} per item rescued · +{SEEDS_PER_DONATED_UNIT} per item donated · +{SEEDS_PER_CHECK_IN} daily
        fridge check · +{SEEDS_PER_BADGE} per badge · +{SEEDS_PER_STAGE} per growth stage · +{SEEDS_PER_DIARY_PHOTO} per meal photo · +
        {SEED_REWARDS['skipped-buy'].seeds} for skipping a double-buy on your shopping list · +{SEED_REWARDS.share.seeds} for sharing your
        impact each week. seeds can&apos;t be bought.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 6, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tiny: { fontSize: 12, lineHeight: 17 },
  button: { minHeight: 0, paddingVertical: 8, paddingHorizontal: 16 },
});
