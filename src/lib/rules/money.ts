import type { Category, Item } from '../types.ts';

/**
 * Rough, deliberately conservative value of one unit of each category, in the
 * user's currency (major units). It's a motivator, not an accounting figure —
 * the UI always shows it with "≈".
 */
export const UNIT_VALUE: Record<Category, number> = {
  dairy: 2,
  meat: 5,
  fish: 5,
  produce: 1.5,
  bakery: 2,
  leftovers: 3,
  frozen: 3,
  tinned: 1,
  dried: 1.5,
  jarred: 2.5,
  packaged: 2,
  uht: 1.5,
  other: 2,
};

/**
 * Money kept out of the bin: food eaten, donated, or frozen. Freezing counts
 * once even if the item is later eaten, so nothing is double-counted.
 */
export function moneySaved(items: Item[]): number {
  const total = items.reduce((sum, item) => {
    const saved = item.status === 'used' || item.status === 'donated' || Boolean(item.frozenAt);
    return saved ? sum + item.quantity * UNIT_VALUE[item.category] : sum;
  }, 0);
  return Math.round(total);
}

/** Money lost to waste, for the gentle "binned ≈ $4" line. */
export function moneyWasted(items: Item[]): number {
  return Math.round(items.filter((i) => i.status === 'wasted').reduce((sum, i) => sum + i.quantity * UNIT_VALUE[i.category], 0));
}
