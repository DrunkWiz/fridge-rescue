import { CATEGORIES } from '../categories.ts';
import type { Category, Item } from '../types.ts';
import { daysUntil } from './dates.ts';

/**
 * Plain-text grocery lists, used two ways: checking a shopping list against
 * what's already in the fridge, and pasting a list to add everything at once.
 * No AI and no network — works for everyone.
 */

export type ListLine = { name: string; quantity: number };

const BULLET = /^\s*(?:[-*•·–]|\[\s?[x ]?\s?\]|\d+[.)])\s*/i;
const PRICE = /\s*[£$€]?\s*\d+[.,]\d{2}\s*$/;
const LEADING_QTY = /^(\d{1,3})\s*(?:x|×)?\s+(.+)$/i;
const TRAILING_QTY = /^(.+?)\s*(?:x|×)\s*(\d{1,3})$/i;

/** Header and footer lines in shared lists ("Shopping list:", "(from Fridge Rescue)"). */
const NOT_AN_ITEM = /^(#|\(|.*:\s*$)/;

/**
 * One line per item; also splits "milk, eggs, spinach". Strips bullets,
 * checkboxes and prices, and skips headers and footers.
 */
export function parseList(text: string): ListLine[] {
  return text
    .split(/[\n,;]+/)
    .map((raw) => raw.replace(BULLET, '').replace(PRICE, '').trim())
    .filter((line) => line.length > 1 && !NOT_AN_ITEM.test(line))
    .map((line) => {
      const lead = line.match(LEADING_QTY);
      if (lead) return { name: lead[2].trim(), quantity: Number(lead[1]) };
      const trail = line.match(TRAILING_QTY);
      if (trail) return { name: trail[1].trim(), quantity: Number(trail[2]) };
      return { name: line, quantity: 1 };
    })
    .filter((l) => l.quantity > 0);
}

/** Lowercase, singular-ish, no punctuation — good enough to match "Tins of chickpeas" to "chickpeas". */
export function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(tins?|cans?|packs?|bags?|jars?|bottles?|of|the|a|some|fresh|organic|large|small)\b/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

export function matches(listName: string, itemName: string): boolean {
  const a = normalise(listName);
  const b = normalise(itemName);
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

export type ShoppingCheck = {
  line: ListLine;
  /** Active items in the fridge that match this line. */
  have: Item[];
  haveQuantity: number;
  /** Soonest expiry among what you have, in days. */
  soonestDays: number | null;
};

/** Active fridge items matching a shopping-list name. */
export function matchingItems(name: string, items: Item[]): Item[] {
  return items.filter((i) => i.status === 'active' && matches(name, i.name));
}

/** Plain text for the family chat; parseList reads it straight back. */
export function formatShareList(lines: ListLine[]): string {
  const body = lines.map((l) => `- ${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name}`).join('\n');
  return `Shopping list:\n${body}\n\n(from Fridge Rescue)`;
}

/** For each line of a shopping list: do you already have it, how much, and when does it expire? */
export function checkShoppingList(text: string, items: Item[], now: Date): ShoppingCheck[] {
  const active = items.filter((i) => i.status === 'active');
  return parseList(text).map((line) => {
    const have = active.filter((i) => matches(line.name, i.name));
    const days = have.map((i) => daysUntil(i.expiresAt, now));
    return {
      line,
      have,
      haveQuantity: have.reduce((n, i) => n + i.quantity, 0),
      soonestDays: days.length ? Math.min(...days) : null,
    };
  });
}

/** Keyword → category guesses for pasted lists. First match wins; storage words come first. */
const CATEGORY_HINTS: [RegExp, Category][] = [
  [/\b(tin|tins|canned|can|beans|chickpea|lentil|tuna|sweetcorn|soup)\b/, 'tinned'],
  [/\b(frozen|ice cream|peas)\b/, 'frozen'],
  [/\b(uht|long.?life|oat milk|almond milk|soy milk)\b/, 'uht'],
  [/\b(pasta|penne|spaghetti|rice|noodle|flour|oats|cereal|couscous|quinoa)\b/, 'dried'],
  [/\b(jam|honey|peanut butter|sauce|pesto|mayo|ketchup|mustard|pickle|olives)\b/, 'jarred'],
  [/\b(crisps|chips|biscuit|cracker|chocolate|snack|cookie)\b/, 'packaged'],
  [/\b(milk|yoghurt|yogurt|cheese|cheddar|butter|cream|egg|eggs)\b/, 'dairy'],
  [/\b(chicken|beef|mince|pork|bacon|sausage|ham|lamb|turkey)\b/, 'meat'],
  [/\b(salmon|cod|fish|prawn|shrimp|haddock)\b/, 'fish'],
  [/\b(bread|loaf|bagel|roll|wrap|tortilla|croissant|bun|sourdough)\b/, 'bakery'],
  [/\b(leftover)\b/, 'leftovers'],
  [/\b(apple|banana|orange|lemon|lime|berr|grape|spinach|lettuce|salad|tomato|potato|onion|carrot|pepper|broccoli|cucumber|mushroom|avocado|garlic|courgette|kale)\w*/, 'produce'],
];

export function guessCategory(name: string): Category {
  const n = name.toLowerCase();
  for (const [pattern, category] of CATEGORY_HINTS) if (pattern.test(n)) return category;
  return 'other';
}

export type PastedItem = { name: string; category: Category; quantity: number; daysUntilExpiry: number };

/** Paste-to-add: list text → items with a category guess and that category's typical shelf life. */
export function itemsFromList(text: string): PastedItem[] {
  return parseList(text).map(({ name, quantity }) => {
    const category = guessCategory(name);
    // "3 tins of black beans" → "Black beans" (the category already says it's tinned).
    const bare = name.replace(/^(tins?|cans?|packs?|bags?|jars?|bottles?|boxes?|packets?)\s+(of\s+)?/i, '') || name;
    const tidy = bare.charAt(0).toUpperCase() + bare.slice(1);
    return { name: tidy, category, quantity: Math.min(quantity, 50), daysUntilExpiry: CATEGORIES[category].defaultShelfLifeDays };
  });
}
