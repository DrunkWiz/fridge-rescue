import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import { create } from 'zustand';

/** The single entitlement configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = 'pro';

/** Free users can track this many active items. Rescuing and donating are never gated. */
export const FREE_ITEM_LIMIT = 25;

/**
 * A Test Store key (prefix `test_`) works both on device and in the browser —
 * the SDK falls back to its browser mode on web. No App Store / Play account needed.
 */
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

type ProState = {
  configured: boolean;
  isPro: boolean;
  setCustomerInfo: (info: CustomerInfo) => void;
};

export const usePro = create<ProState>()((set) => ({
  configured: false,
  isPro: false,
  setCustomerInfo: (info) => set({ isPro: info.entitlements.active[ENTITLEMENT_ID] !== undefined }),
}));

let started = false;

export async function initPurchases(): Promise<void> {
  if (started || !API_KEY) return;
  started = true;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY });
  usePro.setState({ configured: true });
  Purchases.addCustomerInfoUpdateListener((info) => usePro.getState().setCustomerInfo(info));
  await refreshCustomerInfo();
}

export async function refreshCustomerInfo(): Promise<void> {
  if (!usePro.getState().configured) return;
  try {
    usePro.getState().setCustomerInfo(await Purchases.getCustomerInfo());
  } catch (error) {
    console.warn('Could not fetch RevenueCat customer info', error);
  }
}
