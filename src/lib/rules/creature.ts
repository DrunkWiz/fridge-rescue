import type { Item } from '../types.ts';
import { daysSince, daysUntil } from './dates.ts';
import { MEALS_PER_DONATED_ITEM } from './surplus.ts';
import { findRescueCandidates } from './urgency.ts';

export type CreatureMood = 'celebrating' | 'thriving' | 'content' | 'hungry' | 'wilting';

/** How long a donation keeps the creature celebrating. */
export const CELEBRATE_FOR_DAYS = 2;
/** Look-back window for rescues and waste. */
export const MOOD_WINDOW_DAYS = 7;
/** Rescues in the window needed to reach "thriving". */
export const THRIVING_RESCUES = 3;
/** Unresolved expired items needed to make the creature wilt on their own. */
export const WILT_AT_EXPIRED_ITEMS = 2;

function resolvedWithin(items: Item[], status: Item['status'], days: number, now: Date): Item[] {
  return items.filter(
    (item) => item.status === status && item.resolvedAt && daysSince(item.resolvedAt, now) <= days,
  );
}

/**
 * Rescues feed it day to day; donations are the rare celebration; waste is a
 * gentle, visible consequence rather than a punishment.
 */
export function creatureMood(items: Item[], now: Date): CreatureMood {
  if (resolvedWithin(items, 'donated', CELEBRATE_FOR_DAYS, now).length > 0) return 'celebrating';

  const rescued = resolvedWithin(items, 'used', MOOD_WINDOW_DAYS, now).length;
  const wasted = resolvedWithin(items, 'wasted', MOOD_WINDOW_DAYS, now).length;
  const expiredActive = items.filter(
    (item) => item.status === 'active' && !item.shelfStable && daysUntil(item.expiresAt, now) < 0,
  ).length;

  if ((wasted > 0 && wasted > rescued) || expiredActive >= WILT_AT_EXPIRED_ITEMS) return 'wilting';
  if (findRescueCandidates(items, now).length > 0 || expiredActive > 0) return 'hungry';
  if (rescued >= THRIVING_RESCUES) return 'thriving';
  return 'content';
}

export type Impact = { mealsRescued: number; mealsDonated: number; itemsWasted: number };

/** Lifetime counters for the home screen and the shareable card. */
export function lifetimeImpact(items: Item[]): Impact {
  const units = (status: Item['status']) =>
    items.filter((item) => item.status === status).reduce((sum, item) => sum + item.quantity, 0);

  return {
    mealsRescued: Math.round(units('used') * MEALS_PER_DONATED_ITEM),
    mealsDonated: Math.round(units('donated') * MEALS_PER_DONATED_ITEM),
    itemsWasted: units('wasted'),
  };
}
