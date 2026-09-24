/**
 * Browser preview: AdMob has no web SDK, so the ad is simulated with a confirm
 * dialog. Everything around it (caps, seeds, Pro skipping the ad) is the same.
 */
export async function showRewardedAd(placement: string): Promise<boolean> {
  return window.confirm(`Test ad (${placement}): the browser preview can't show real ads. Pretend you watched it?`);
}
