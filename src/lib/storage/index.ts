import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * The whole dataset is ~50 items, so it lives as one JSON blob in AsyncStorage:
 * loaded on launch, written back on every change. No database needed.
 */
export const persistStorage = createJSONStorage(() => AsyncStorage);

export const STORAGE_KEYS = {
  items: 'fridge-rescue/items',
} as const;
