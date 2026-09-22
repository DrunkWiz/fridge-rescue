import type { Category } from './types.ts';

type CategoryInfo = {
  label: string;
  shelfStable: boolean;
  /** Suggested days until expiry when the user doesn't enter a date. */
  defaultShelfLifeDays: number;
};

export const CATEGORIES: Record<Category, CategoryInfo> = {
  dairy: { label: 'Dairy', shelfStable: false, defaultShelfLifeDays: 7 },
  meat: { label: 'Meat', shelfStable: false, defaultShelfLifeDays: 3 },
  fish: { label: 'Fish', shelfStable: false, defaultShelfLifeDays: 2 },
  produce: { label: 'Fruit & veg', shelfStable: false, defaultShelfLifeDays: 5 },
  bakery: { label: 'Bakery', shelfStable: false, defaultShelfLifeDays: 4 },
  leftovers: { label: 'Leftovers', shelfStable: false, defaultShelfLifeDays: 3 },
  frozen: { label: 'Frozen', shelfStable: false, defaultShelfLifeDays: 90 },
  tinned: { label: 'Tinned', shelfStable: true, defaultShelfLifeDays: 540 },
  dried: { label: 'Dried (pasta, rice…)', shelfStable: true, defaultShelfLifeDays: 365 },
  jarred: { label: 'Jarred', shelfStable: true, defaultShelfLifeDays: 365 },
  packaged: { label: 'Packaged snacks', shelfStable: true, defaultShelfLifeDays: 180 },
  uht: { label: 'UHT / long-life', shelfStable: true, defaultShelfLifeDays: 180 },
  other: { label: 'Other', shelfStable: false, defaultShelfLifeDays: 7 },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
