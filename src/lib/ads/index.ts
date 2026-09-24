import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import Purchases, { AdFormat, AdMediatorName, AdRevenuePrecision } from 'react-native-purchases';

import { useProState } from '@/lib/purchases';

/**
 * Opt-in rewarded ads (AdMob): watch one, get seeds. Never forced, capped per
 * day, and Pro collects the reward without the ad. Every impression, click and
 * paid event is reported to RevenueCat's ad tracker, so ad revenue sits next to
 * subscription revenue in one dashboard.
 *
 * Without an AdMob account this uses Google's sample rewarded unit, which always
 * serves a clearly labelled test ad and never pays out.
 */
const AD_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID?.trim() || TestIds.REWARDED;

let initialised: Promise<unknown> | null = null;

const PRECISION = [AdRevenuePrecision.unknown, AdRevenuePrecision.estimated, AdRevenuePrecision.publisherDefined, AdRevenuePrecision.exact];

/** Reports to RevenueCat when purchases are configured; tracking never blocks the ad. */
function track(report: () => Promise<void>) {
  if (!useProState.getState().configured) return;
  report().catch((error) => console.warn('RevenueCat ad tracking failed', error));
}

/** Loads and shows one rewarded ad. Resolves true only if the user earned the reward. */
export async function showRewardedAd(placement: string): Promise<boolean> {
  initialised ??= mobileAds().initialize();
  await initialised;

  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(AD_UNIT_ID);
    const impressionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const meta = { mediatorName: AdMediatorName.adMob, adFormat: AdFormat.rewarded, adUnitId: AD_UNIT_ID, impressionId, placement };
    let earned = false;

    const unsubscribe = ad.addAdEventsListener(({ type, payload }) => {
      switch (type) {
        case RewardedAdEventType.LOADED:
          track(() => Purchases.adTracker.trackAdLoaded(meta));
          ad.show().catch(() => finish());
          break;
        case AdEventType.OPENED:
          track(() => Purchases.adTracker.trackAdDisplayed(meta));
          break;
        case AdEventType.CLICKED:
          track(() => Purchases.adTracker.trackAdOpened(meta));
          break;
        case AdEventType.PAID: {
          const paid = payload as { value: number; currency: string; precision: number; valueMicros?: string | null };
          const revenueMicros = paid.valueMicros ? Number(paid.valueMicros) : Math.round(paid.value * 1_000_000);
          track(() =>
            Purchases.adTracker.trackAdRevenue({ ...meta, revenueMicros, currency: paid.currency, precision: PRECISION[paid.precision] ?? AdRevenuePrecision.unknown }),
          );
          break;
        }
        case RewardedAdEventType.EARNED_REWARD:
          earned = true;
          break;
        case AdEventType.ERROR:
          track(() => Purchases.adTracker.trackAdFailedToLoad({ mediatorName: meta.mediatorName, adFormat: meta.adFormat, adUnitId: AD_UNIT_ID, placement }));
          finish();
          break;
        case AdEventType.CLOSED:
          finish();
          break;
      }
    });

    function finish() {
      unsubscribe();
      resolve(earned);
    }

    ad.load();
  });
}
