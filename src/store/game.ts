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
  loggedSeeds,
  rewardsLeft,
  SEED_REWARDS,
  SEEDS_PER_DIARY_PHOTO,
  seedsEarned,
  seedsSpent,
  snapshot,
  stageSeeds,
  totalXp,
  type SeedEvent,
  type SeedEventKind,
  type AccessoryId,
  type Celebration,
  type Slot,
} from '@/lib/rules/progress';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Item } from '@/lib/types';
import { useDiary } from '@/store/diary';
import { useItems } from '@/store/items';

export type Moment =
  | ({ kind: 'win'; undo?: Item[] } & Celebration)
  | { kind: 'bought'; id: AccessoryId }
  /** Light feedback for everyday actions, with undo. */
  | { kind: 'toast'; text: string; undo?: Item[]; undoFn?: () => void };

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
  /** Takes off anything not in `owned` (e.g. admin-mode outfits once admin mode is off). */
  keepOnly: (owned: AccessoryId[]) => void;
  /** Silent, automatic: the first time the fridge is looked at each day. */
  checkIn: () => void;
  /** Seen the first-launch intro. */
  onboarded: boolean;
  /** What the user called their pet; empty means "sprout". */
  sproutName: string;
  finishOnboarding: (name: string) => void;
  /** Month keys (YYYY-MM), one per photo scan — for the free monthly allowance. */
  scans: string[];
  recordScan: () => void;
  /** Returns false if the user can't afford it. */
  buy: (id: AccessoryId) => boolean;
  /** One-off seed rewards (ads, skipped double-buys, shares), capped per day or week. */
  seedLog: SeedEvent[];
  /** Pays out if there's room under the cap; returns the seeds earned (0 if capped). */
  earnSeeds: (kind: SeedEventKind) => number;
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
      seedLog: [],
      earnSeeds: (kind) => {
        const s = useGame.getState();
        if (rewardsLeft(s.seedLog, kind, new Date()) === 0) return 0;
        set({ seedLog: [...s.seedLog, { kind, at: new Date().toISOString() }] });
        haptic('success');
        return SEED_REWARDS[kind].seeds;
      },
      onboarded: false,
      sproutName: '',
      finishOnboarding: (name) => set({ onboarded: true, sproutName: name.trim().slice(0, 16) }),
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
      keepOnly: (owned) =>
        set((s) => ({
          equipped: Object.fromEntries(Object.entries(s.equipped).filter(([, id]) => id && owned.includes(id))),
        })),
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
      partialize: (s) => ({
        equipped: s.equipped,
        checkIns: s.checkIns,
        bought: s.bought,
        scans: s.scans,
        seedLog: s.seedLog,
        onboarded: s.onboarded,
        sproutName: s.sproutName,
      }),
    },
  ),
);

type BalanceInput = {
  items: Item[];
  startedAt: string | null;
  checkIns: string[];
  bought: AccessoryId[];
  seedLog: SeedEvent[];
  diaryPhotos: number;
};

/**
 * Seeds earned minus spent. Almost everything is derived from the fridge and the
 * diary, so it can't drift; only capped one-off rewards come from the log.
 */
function balance({ items, startedAt, checkIns, bought, seedLog, diaryPhotos }: BalanceInput): number {
  const now = new Date();
  return (
    seedsEarned(items, earnedBadges(items, now, startedAt), checkIns) +
    challengeSeeds(items, now, startedAt) +
    stageSeeds(totalXp(items)) +
    diaryPhotos * SEEDS_PER_DIARY_PHOTO +
    loggedSeeds(seedLog) -
    seedsSpent(bought)
  );
}

export function seedBalance(): number {
  const { items, startedAt } = useItems.getState();
  const { checkIns, bought, seedLog } = useGame.getState();
  const diaryPhotos = useDiary.getState().entries.filter((e) => e.photoUri).length;
  return balance({ items, startedAt, checkIns, bought, seedLog, diaryPhotos });
}

export function useSeedBalance(): number {
  const items = useItems((s) => s.items);
  const startedAt = useItems((s) => s.startedAt);
  const checkIns = useGame((s) => s.checkIns);
  const bought = useGame((s) => s.bought);
  const seedLog = useGame((s) => s.seedLog);
  const diaryPhotos = useDiary((s) => s.entries.filter((e) => e.photoUri).length);
  return balance({ items, startedAt, checkIns, bought, seedLog, diaryPhotos });
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
  useGame.getState().showMoment({ kind: 'toast', text: `${label} · ${sproutName()} is a bit sad`, undo: previous });
  haptic('warning');
}

/** The pet's display name (lowercase, like the rest of the app's voice). */
export function sproutName(): string {
  return (useGame.getState().sproutName || 'sprout').toLowerCase();
}

export function useSproutName(): string {
  return (useGame((s) => s.sproutName) || 'sprout').toLowerCase();
}

/** Monthly photo scans free users get; Pro is unlimited. */
export const FREE_SCANS_PER_MONTH = 3;

export function useFreeScansLeft(): number {
  const scans = useGame((s) => s.scans);
  const month = dayKey(new Date()).slice(0, 7);
  return Math.max(0, FREE_SCANS_PER_MONTH - scans.filter((m) => m === month).length);
}
