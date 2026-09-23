import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, STORAGE_KEYS } from '@/lib/storage';

/** The single entitlement configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'pro';

/** Free users can track this many active items. Rescuing and donating are never gated. */
export const FREE_ITEM_LIMIT = 25;

/**
 * A Test Store key (prefix `test_`) works both on device and in the browser —
 * the SDK falls back to its browser mode on web. No App Store / Play account needed.
 */
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();

/**
 * Admin mode for judges and testing: Pro on, every outfit unlocked and free to swap.
 * The code is deliberately simple and published in the README, because judges need
 * to reach every feature without buying anything. This app is never shipped to a
 * store (Next Gen track), so it works in every build; remove it before any real release.
 */
export const ADMIN_CODE = 'shipaton';

type ProState = {
  configured: boolean;
  /** Real entitlement from RevenueCat. */
  entitled: boolean;
  /** Admin mode (see ADMIN_CODE). */
  adminOverride: boolean;
  setCustomerInfo: (info: CustomerInfo) => void;
  /** Returns true if the key matched and Pro was switched on. */
  unlockAdmin: (key: string) => boolean;
  clearAdmin: () => void;
};

export const useProState = create<ProState>()(
  persist(
    (set) => ({
      configured: false,
      entitled: false,
      adminOverride: false,
      setCustomerInfo: (info) => set({ entitled: info.entitlements.active[ENTITLEMENT_ID] !== undefined }),
      unlockAdmin: (key) => {
        const ok = key.trim().toLowerCase() === ADMIN_CODE;
        if (ok) set({ adminOverride: true });
        return ok;
      },
      clearAdmin: () => set({ adminOverride: false }),
    }),
    // Only the override is persisted; entitlement always comes fresh from RevenueCat.
    { name: STORAGE_KEYS.admin, storage: persistStorage, partialize: (s) => ({ adminOverride: s.adminOverride }) },
  ),
);

export type ProSource = 'purchase' | 'admin' | null;

/** How the user has Pro, if at all. Purchases take precedence over the admin override. */
export function useProSource(): ProSource {
  return useProState((s) => (s.entitled ? 'purchase' : s.adminOverride ? 'admin' : null));
}

/** Admin mode also unlocks every outfit, not just Pro. */
export function useIsAdmin(): boolean {
  return useProState((s) => s.adminOverride);
}

export function useIsPro(): boolean {
  return useProSource() !== null;
}

let started = false;

export async function initPurchases(): Promise<void> {
  if (started || !API_KEY) return;
  started = true;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY });
  useProState.setState({ configured: true });
  Purchases.addCustomerInfoUpdateListener((info) => useProState.getState().setCustomerInfo(info));
  await refreshCustomerInfo();
}

export async function refreshCustomerInfo(): Promise<void> {
  if (!useProState.getState().configured) return;
  try {
    useProState.getState().setCustomerInfo(await Purchases.getCustomerInfo());
  } catch (error) {
    console.warn('Could not fetch RevenueCat customer info', error);
  }
}
