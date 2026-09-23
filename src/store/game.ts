import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  ACCESSORIES,
  challengeSeeds,
  dayKey,
  diffProgress,
  earnedBadges,
  seedsEarned,
  seedsSpent,
  snapshot,
  type AccessoryId,
  type Celebration,
  type Slot,
} from '@/lib/rules/progress';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Item } from '@/lib/types';
import { useItems } from '@/store/items';

export type Moment =
  | ({ kind: 'win'; undo?: Item[] } & Celebration)
  | { kind: 'bought'; id: AccessoryId }
  /** Light feedback for everyday actions, with undo. */
  | { kind: 'toast'; text: string; undo?: Item[] };

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
  /** Silent, automatic: the first time the fridge is looked at each day. */
  checkIn: () => void;
  /** Month keys (YYYY-MM), one per photo scan — for the free monthly allowance. */
  scans: string[];
  recordScan: () => void;
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
      scans: [],
      checkIn: () =>
        set((s) => {
          const today = dayKey(new Date());
          return s.checkIns.includes(today) ? s : { checkIns: [...s.checkIns, today] };
        }),
      recordScan: () => set((s) => ({ scans: [...s.scans, dayKey(new Date()).slice(0, 7)] })),
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
      partialize: (s) => ({ equipped: s.equipped, checkIns: s.checkIns, bought: s.bought, scans: s.scans }),
    },
  ),
);

/** Seeds earned minus spent. Earned is derived from the fridge, so it can't drift. */
export function seedBalance(): number {
  const { items, startedAt } = useItems.getState();
  const { checkIns, bought } = useGame.getState();
  const now = new Date();
  return seedsEarned(items, earnedBadges(items, now, startedAt), checkIns) + challengeSeeds(items, now, startedAt) - seedsSpent(bought);
}

export function useSeedBalance(): number {
  const items = useItems((s) => s.items);
  const startedAt = useItems((s) => s.startedAt);
  const checkIns = useGame((s) => s.checkIns);
  const bought = useGame((s) => s.bought);
  const now = new Date();
  return seedsEarned(items, earnedBadges(items, now, startedAt), checkIns) + challengeSeeds(items, now, startedAt) - seedsSpent(bought);
}

function haptic(kind: 'success' | 'warning') {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
}

/**
 * Run a store action and reward it. Everyday saves get a light toast with undo;
 * the full confetti card is kept for milestones (level-up, badge, challenge),
 * so it stays special. Snapshots before and after, so any action gets this.
 */
export function withCelebration(action: () => void, label: string) {
  const { items: previous, startedAt } = useItems.getState();
  const before = snapshot(previous, new Date(), startedAt);
  action();
  const after = snapshot(useItems.getState().items, new Date(), startedAt);
  const c = diffProgress(before, after);
  if (c && (c.levelUp || c.newBadges.length > 0 || c.challenge)) {
    useGame.getState().showMoment({ kind: 'win', ...c, undo: previous });
  } else {
    useGame.getState().showMoment({ kind: 'toast', text: `${label}${c ? ` · +${c.xpGained} xp` : ''}`, undo: previous });
  }
  haptic('success');
}

/** Binning food: a gentle, visible consequence — never a guilt trip — with undo for mis-taps. */
export function withWasteNudge(action: () => void, label: string) {
  const previous = useItems.getState().items;
  action();
  useGame.getState().showMoment({ kind: 'toast', text: `${label} · sprout is a bit sad`, undo: previous });
  haptic('warning');
}

/** Monthly photo scans free users get; Pro is unlimited. */
export const FREE_SCANS_PER_MONTH = 3;

export function useFreeScansLeft(): number {
  const scans = useGame((s) => s.scans);
  const month = dayKey(new Date()).slice(0, 7);
  return Math.max(0, FREE_SCANS_PER_MONTH - scans.filter((m) => m === month).length);
}
