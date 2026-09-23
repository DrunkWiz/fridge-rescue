import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { deletePhoto } from '@/lib/photos';
import { persistStorage, STORAGE_KEYS } from '@/lib/storage';

/** A meal made from rescued food — the photo is optional. */
export type DiaryEntry = {
  id: string;
  /** ISO timestamp */
  at: string;
  title: string;
  /** What was rescued to make it. */
  itemNames: string[];
  photoUri?: string;
};

type DiaryState = {
  entries: DiaryEntry[];
  add: (entry: DiaryEntry) => void;
  remove: (id: string) => void;
};

export const useDiary = create<DiaryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) => set((s) => ({ entries: [entry, ...s.entries] })),
      remove: (id) =>
        set((s) => {
          deletePhoto(s.entries.find((e) => e.id === id)?.photoUri);
          return { entries: s.entries.filter((e) => e.id !== id) };
        }),
    }),
    { name: STORAGE_KEYS.diary, storage: persistStorage },
  ),
);
