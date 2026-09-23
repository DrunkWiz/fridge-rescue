import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  ACCESSORIES,
  dayKey,
  diffProgress,
  earnedBadges,
  SEEDS_PER_CHECK_IN,
  seedsEarned,
  seedsSpent,
  snapshot,
  type AccessoryId,
  type Celebration,
  type Slot,
} from '@/lib/rules/progress';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';
import { useItems } from '@/store/items';

export type Moment =
  | ({ kind: 'win' } & Celebration)
  | { kind: 'waste'; streakLost: number }
  | { kind: 'check-in'; seeds: number }
  | { kind: 'bought'; id: AccessoryId };

type GameState = {
  /** What Sprout is wearing, one accessory per slot. */
  equipped: Partial<Record<Slot, AccessoryId>>;
  /** The celebration (or gentle nudge) to show next; not persisted. */
  moment: Moment | null;
  /** Days (YYYY-MM-DD) the user did their fridge check. */
  checkIns: string[];
  /** Accessories bought in the shop with seeds. */
  bought: AccessoryId[];
  toggleAccessory: (id: AccessoryId) => void;
  checkIn: () => void;
  /** Returns false if the user can't afford it. */
  buy: (id: AccessoryId) => boolean;
  showMoment: (moment: Moment) => void;
  dismissMoment: () => void;
};

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      equipped: {},
      moment: null,
      checkIns: [],
      bought: [],
      checkIn: () =>
        set((s) => {
          const today = dayKey(new Date());
          if (s.checkIns.includes(today)) return s;
          haptic('success');
          return { checkIns: [...s.checkIns, today], moment: { kind: 'check-in', seeds: SEEDS_PER_CHECK_IN } };
        }),
      buy: (id) => {
        const s = useGame.getState();
        const price = ACCESSORIES[id].price;
        if (price === undefined || s.bought.includes(id) || seedBalance() < price) return false;
        const slot = ACCESSORIES[id].slot;
        set({ bought: [...s.bought, id], equipped: { ...s.equipped, [slot]: id }, moment: { kind: 'bought', id } });
        haptic('success');
        return true;
      },
      toggleAccessory: (id) =>
        set((s) => {
          const slot = ACCESSORIES[id].slot;
          return { equipped: { ...s.equipped, [slot]: s.equipped[slot] === id ? undefined : id } };
        }),
      showMoment: (moment) => set({ moment }),
      dismissMoment: () => set({ moment: null }),
    }),
    {
      name: STORAGE_KEYS.game,
      storage: persistStorage,
      partialize: (s) => ({ equipped: s.equipped, checkIns: s.checkIns, bought: s.bought }),
    },
  ),
);

/** Seeds earned minus spent. Earned is derived from the fridge, so it can't drift. */
export function seedBalance(): number {
  const { items, startedAt } = useItems.getState();
  const { checkIns, bought } = useGame.getState();
  return seedsEarned(items, earnedBadges(items, new Date(), startedAt), checkIns) - seedsSpent(bought);
}

export function useSeedBalance(): number {
  const items = useItems((s) => s.items);
  const startedAt = useItems((s) => s.startedAt);
  const checkIns = useGame((s) => s.checkIns);
  const bought = useGame((s) => s.bought);
  return seedsEarned(items, earnedBadges(items, new Date(), startedAt), checkIns) - seedsSpent(bought);
}

function haptic(kind: 'success' | 'warning') {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
}

/**
 * Run a store action and celebrate whatever it earned: XP, a new growth stage,
 * new badges. Snapshots before and after, so any action gets this for free.
 */
export function withCelebration(action: () => void) {
  const { startedAt } = useItems.getState();
  const before = snapshot(useItems.getState().items, new Date(), startedAt);
  action();
  const after = snapshot(useItems.getState().items, new Date(), startedAt);
  const celebration = diffProgress(before, after);
  if (!celebration) return;
  useGame.getState().showMoment({ kind: 'win', ...celebration });
  haptic('success');
}

/** Binning food: a gentle, visible consequence — never a guilt trip. */
export function withWasteNudge(action: () => void, streakBefore: number) {
  action();
  useGame.getState().showMoment({ kind: 'waste', streakLost: streakBefore });
  haptic('warning');
}
