import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CATEGORIES } from '@/lib/categories';
import { addDays } from '@/lib/rules/dates';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Category, Item, ItemStatus } from '@/lib/types';

export type NewItem = {
  name: string;
  category: Category;
  quantity: number;
  expiresAt: string;
  opened?: boolean;
};

export type DonationEntry = { id: string; quantity: number };

type ItemsState = {
  items: Item[];
  addItem: (input: NewItem) => void;
  setStatus: (id: string, status: ItemStatus) => void;
  /** Rescue: the user cooked these. */
  markUsed: (ids: string[]) => void;
  /** Donate: splits off partial quantities so the rest stays in the fridge. */
  donate: (entries: DonationEntry[], dropOffName: string) => void;
  setOpened: (id: string, opened: boolean) => void;
  removeItem: (id: string) => void;
  loadDemoData: () => void;
  clearAll: () => void;
};

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildItem(input: NewItem, addedAt: Date = new Date()): Item {
  return {
    id: makeId(),
    name: input.name.trim(),
    category: input.category,
    shelfStable: CATEGORIES[input.category].shelfStable,
    quantity: input.quantity,
    addedAt: addedAt.toISOString(),
    expiresAt: input.expiresAt,
    opened: input.opened ?? false,
    status: 'active',
  };
}

/** A fridge that exercises both branches — used for the demo video and first run. */
function demoItems(now: Date): Item[] {
  const at = (days: number) => addDays(now, days).toISOString();
  const seed: [NewItem, number][] = [
    [{ name: 'Greek yoghurt', category: 'dairy', quantity: 1, expiresAt: at(1) }, -5],
    [{ name: 'Spinach', category: 'produce', quantity: 1, expiresAt: at(2) }, -3],
    [{ name: 'Chicken thighs', category: 'meat', quantity: 1, expiresAt: at(2) }, -1],
    [{ name: 'Cheddar', category: 'dairy', quantity: 1, expiresAt: at(12) }, -4],
    [{ name: 'Sourdough', category: 'bakery', quantity: 1, expiresAt: at(4) }, -1],
    [{ name: 'Chickpeas', category: 'tinned', quantity: 5, expiresAt: at(500) }, -12],
    [{ name: 'Penne', category: 'dried', quantity: 1, expiresAt: at(300) }, -40],
    [{ name: 'Penne', category: 'dried', quantity: 1, expiresAt: at(320) }, -2],
    [{ name: 'Chopped tomatoes', category: 'tinned', quantity: 3, expiresAt: at(420) }, -8],
    [{ name: 'Oat milk (UHT)', category: 'uht', quantity: 1, expiresAt: at(150) }, -45],
  ];
  return seed.map(([input, addedDaysAgo]) => buildItem(input, addDays(now, addedDaysAgo)));
}

export const useItems = create<ItemsState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (input) => set((s) => ({ items: [...s.items, buildItem(input)] })),
      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id
              ? { ...item, status, resolvedAt: status === 'active' ? undefined : new Date().toISOString() }
              : item,
          ),
        })),
      markUsed: (ids) =>
        set((s) => {
          const resolvedAt = new Date().toISOString();
          return {
            items: s.items.map((item) => (ids.includes(item.id) ? { ...item, status: 'used' as const, resolvedAt } : item)),
          };
        }),
      donate: (entries, dropOffName) =>
        set((s) => {
          const resolvedAt = new Date().toISOString();
          const donated: Item[] = [];
          const items = s.items.map((item) => {
            const entry = entries.find((e) => e.id === item.id);
            if (!entry || entry.quantity <= 0) return item;
            const record = { status: 'donated' as const, resolvedAt, donatedTo: dropOffName };
            if (entry.quantity >= item.quantity) return { ...item, ...record };
            donated.push({ ...item, ...record, id: makeId(), quantity: entry.quantity });
            return { ...item, quantity: item.quantity - entry.quantity };
          });
          return { items: [...items, ...donated] };
        }),
      setOpened: (id, opened) =>
        set((s) => ({ items: s.items.map((item) => (item.id === id ? { ...item, opened } : item)) })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
      loadDemoData: () => set({ items: demoItems(new Date()) }),
      clearAll: () => set({ items: [] }),
    }),
    { name: STORAGE_KEYS.items, storage: persistStorage, version: 1 },
  ),
);
