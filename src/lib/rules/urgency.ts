import type { Item } from '../types.ts';
import { daysUntil } from './dates.ts';

/** Freezing a perishable buys roughly this many more days. */
export const FREEZER_EXTENSION_DAYS = 60;

/** Only fresh, unfrozen perishables can be frozen to save them. */
export function canFreeze(item: Item): boolean {
  return item.status === 'active' && !item.shelfStable && !item.frozenAt && item.category !== 'frozen';
}

/** Perishables expiring within this many days are offered for rescue. */
export const RESCUE_WINDOW_DAYS = 3;

export type Urgency = 'expired' | 'today' | 'soon' | 'this-week' | 'fine';

export function urgencyOf(item: Item, now: Date): Urgency {
  const days = daysUntil(item.expiresAt, now);
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= RESCUE_WINDOW_DAYS) return 'soon';
  if (days <= 7) return 'this-week';
  return 'fine';
}

/** Active items, soonest expiry first; ties broken by name so the list is stable. */
export function sortByUrgency(items: Item[]): Item[] {
  return items
    .filter((item) => item.status === 'active')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.name.localeCompare(b.name));
}

/**
 * RESCUE branch: perishables that should be cooked now. Expired items are excluded —
 * the app should never suggest eating something past its date.
 */
export function findRescueCandidates(items: Item[], now: Date): Item[] {
  return sortByUrgency(items).filter((item) => {
    if (item.shelfStable) return false;
    const days = daysUntil(item.expiresAt, now);
    return days >= 0 && days <= RESCUE_WINDOW_DAYS;
  });
}
