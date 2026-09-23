import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ListLine } from '@/lib/rules/lists';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';

export type ShoppingEntry = { id: string; name: string; quantity: number; addedAt: string };

type ShoppingState = {
  entries: ShoppingEntry[];
  /** Adds lines, merging with anything already on the list by name. */
  add: (lines: ListLine[]) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  restore: (entries: ShoppingEntry[]) => void;
  clear: () => void;
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const useShopping = create<ShoppingState>()(
  persist(
    (set) => ({
      entries: [],
      add: (lines) =>
        set((s) => {
          const entries = [...s.entries];
          for (const line of lines) {
            const name = line.name.trim();
            if (!name) continue;
            const existing = entries.find((e) => e.name.toLowerCase() === name.toLowerCase());
            if (existing) existing.quantity = Math.max(existing.quantity, line.quantity);
            else entries.push({ id: makeId(), name, quantity: line.quantity, addedAt: new Date().toISOString() });
          }
          return { entries };
        }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      setQuantity: (id, quantity) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, quantity: Math.max(1, quantity) } : e)) })),
      restore: (entries) => set({ entries }),
      clear: () => set({ entries: [] }),
    }),
    { name: STORAGE_KEYS.shopping, storage: persistStorage },
  ),
);
