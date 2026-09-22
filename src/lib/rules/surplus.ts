import type { Item } from '../types.ts';
import { daysSince, daysUntil } from './dates.ts';

/**
 * Food banks need weeks to sort, store and distribute donations, so anything
 * closer to expiry than this is a RESCUE problem, not a DONATE one.
 */
export const DONATION_MIN_DAYS_TO_EXPIRY = 60;

/** Holding more than this many of one item counts as a surplus signal. */
export const SURPLUS_QUANTITY_THRESHOLD = 2;

/** Items untouched for longer than this are probably never getting eaten. */
export const STALE_AFTER_DAYS = 30;

/**
 * Rough conversion used for the "that's about N meals for someone" copy.
 * A tin or a bag of pasta is most of a meal, not a whole one.
 */
export const MEALS_PER_DONATED_ITEM = 0.7;

export type SurplusReason = 'quantity' | 'stale' | 'duplicate';

export type DonationCandidate = {
  item: Item;
  reasons: SurplusReason[];
  /** How many units to suggest giving away. The user can adjust. */
  suggestedQuantity: number;
};

function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Hard requirements: food a food bank could actually use. */
export function isDonatable(item: Item, now: Date): boolean {
  return (
    item.status === 'active' &&
    item.shelfStable &&
    !item.opened &&
    daysUntil(item.expiresAt, now) > DONATION_MIN_DAYS_TO_EXPIRY
  );
}

/**
 * Entries whose name matches an earlier-added active entry. The earliest one is
 * "the one you own"; later ones are the duplicates.
 */
function findDuplicateIds(items: Item[]): Set<string> {
  const firstSeen = new Map<string, Item>();
  const duplicates = new Set<string>();
  const byAge = items
    .filter((item) => item.status === 'active')
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));

  for (const item of byAge) {
    const key = normaliseName(item.name);
    if (firstSeen.has(key)) duplicates.add(item.id);
    else firstSeen.set(key, item);
  }
  return duplicates;
}

/**
 * DONATE branch. An item is a candidate only if it is donatable AND shows at
 * least one surplus signal. Never returns perishables or short-dated food.
 */
export function findDonationCandidates(items: Item[], now: Date): DonationCandidate[] {
  const duplicateIds = findDuplicateIds(items);
  const candidates: DonationCandidate[] = [];

  for (const item of items) {
    if (!isDonatable(item, now)) continue;

    const reasons: SurplusReason[] = [];
    let suggestedQuantity = 0;

    if (item.quantity > SURPLUS_QUANTITY_THRESHOLD) {
      reasons.push('quantity');
      suggestedQuantity = Math.max(suggestedQuantity, item.quantity - SURPLUS_QUANTITY_THRESHOLD);
    }
    if (daysSince(item.addedAt, now) > STALE_AFTER_DAYS) {
      reasons.push('stale');
      suggestedQuantity = item.quantity;
    }
    if (duplicateIds.has(item.id)) {
      reasons.push('duplicate');
      suggestedQuantity = item.quantity;
    }

    if (reasons.length > 0) candidates.push({ item, reasons, suggestedQuantity });
  }

  return candidates;
}

export function countUnits(candidates: DonationCandidate[]): number {
  return candidates.reduce((sum, c) => sum + c.suggestedQuantity, 0);
}

export function estimateMeals(units: number): number {
  return Math.round(units * MEALS_PER_DONATED_ITEM);
}
