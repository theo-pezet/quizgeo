/**
 * Les questions signalées comme fausses, périmées ou hors sujet. Séparées de
 * la progression : « réinitialiser » ne les efface pas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ReportItem } from '@/lib/reports';

interface ReportsStore {
  items: Record<string, ReportItem>;
  toggle: (key: string, unitTitle?: string) => void;
  clear: () => void;
}

export const useReports = create<ReportsStore>()(
  persist(
    (set) => ({
      items: {},
      toggle: (key, unitTitle) =>
        set((state) => {
          const items = { ...state.items };
          if (items[key]) delete items[key];
          else items[key] = { key, at: new Date().toISOString(), unitTitle };
          return { items };
        }),
      clear: () => set({ items: {} }),
    }),
    { name: 'reports.v1', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
