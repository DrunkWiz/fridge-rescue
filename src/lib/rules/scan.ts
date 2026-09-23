import { CATEGORIES } from '../categories.ts';
import type { Category } from '../types.ts';

/** One line of a scanned receipt or photo, after cleaning — ready for the review screen. */
export type ScannedItem = {
  name: string;
  category: Category;
  quantity: number;
  daysUntilExpiry: number;
};

/** What the model returns, before we trust it. */
export type RawScannedItem = {
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  daysUntilExpiry?: unknown;
};

const MAX_QUANTITY = 50;
const MAX_DAYS = 5 * 365;
/** Receipts list non-food too; anything with these words is dropped. */
const NOT_FOOD = /\b(bag|carrier|bags|deposit|coupon|discount|total|subtotal|vat|tax|change|cash|card|visa|mastercard|balance|points)\b/i;

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function tidyName(value: unknown): string {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  // "SEMI SKIMMED MILK 2L" → "Semi skimmed milk 2L": lowercase the words, keep
  // tokens with digits (sizes, units) as printed; leave mixed-case names alone.
  if (s !== s.toUpperCase()) return s;
  const words = s.split(' ').map((w) => (/\d/.test(w) ? w : w.toLowerCase()));
  const first = words[0] ?? '';
  return [first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

/**
 * Model output is a suggestion: clamp numbers, fall back to category defaults,
 * drop non-food lines, and merge duplicates (receipts often list the same
 * product on several lines).
 */
export function sanitizeScan(raw: RawScannedItem[]): ScannedItem[] {
  const merged = new Map<string, ScannedItem>();
  for (const r of raw) {
    const name = tidyName(r.name);
    if (!name || NOT_FOOD.test(name)) continue;
    const category = (typeof r.category === 'string' && r.category in CATEGORIES ? r.category : 'other') as Category;
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, toInt(r.quantity, 1)));
    const days = Math.min(MAX_DAYS, Math.max(0, toInt(r.daysUntilExpiry, CATEGORIES[category].defaultShelfLifeDays)));

    const key = name.toLowerCase();
    const existing = merged.get(key);
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    else merged.set(key, { name, category, quantity, daysUntilExpiry: days });
  }
  return [...merged.values()];
}
