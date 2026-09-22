import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { diffProgress, snapshot, type AccessoryId, type Celebration, type Slot, ACCESSORIES } from '@/lib/rules/progress';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';
import { useItems } from '@/store/items';

export type Moment = ({ kind: 'win' } & Celebration) | { kind: 'waste'; streakLost: number };

type GameState = {
  /** What Sprout is wearing, one accessory per slot. */
  equipped: Partial<Record<Slot, AccessoryId>>;
  /** The celebration (or gentle nudge) to show next; not persisted. */
  moment: Moment | null;
  toggleAccessory: (id: AccessoryId) => void;
  showMoment: (moment: Moment) => void;
  dismissMoment: () => void;
};

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      equipped: {},
      moment: null,
      toggleAccessory: (id) =>
        set((s) => {
          const slot = ACCESSORIES[id].slot;
          return { equipped: { ...s.equipped, [slot]: s.equipped[slot] === id ? undefined : id } };
        }),
      showMoment: (moment) => set({ moment }),
      dismissMoment: () => set({ moment: null }),
    }),
    { name: STORAGE_KEYS.game, storage: persistStorage, partialize: (s) => ({ equipped: s.equipped }) },
  ),
);

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
