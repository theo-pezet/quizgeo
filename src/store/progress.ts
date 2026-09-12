/**
 * Le store de progression : persiste l'état du moteur, rien d'autre.
 *
 * Toute règle de jeu vit dans src/game/. Ici on ne fait que : lire l'état,
 * appeler une fonction pure, écrire le résultat. Chaque écriture est
 * persistée aussitôt (une fermeture forcée ne coûte jamais plus d'une réponse).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { applyTick, emptyProgress, migrateProgress, type Progress } from '@/game';

interface ProgressStore {
  progress: Progress;
  hydrated: boolean;
  setProgress: (progress: Progress) => void;
  /** Remet l'état au présent (quêtes du jour, ligue, énergie régénérée). */
  tick: () => void;
  reset: () => void;
  markHydrated: () => void;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      progress: emptyProgress(),
      hydrated: false,
      setProgress: (progress) => set({ progress }),
      tick: () => set((state) => ({ progress: applyTick(state.progress, new Date()) })),
      reset: () => set({ progress: applyTick(emptyProgress(), new Date()) }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'progress.v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ progress: state.progress }),
      // Quelle que soit la version stockée, on complète les champs manquants.
      migrate: (persisted) => {
        const raw = (persisted as { progress?: unknown } | undefined)?.progress;
        return { progress: migrateProgress(raw) } as unknown as ProgressStore;
      },
      onRehydrateStorage: () => (state) => {
        state?.tick();
        state?.markHydrated();
      },
    },
  ),
);

interface SettingsStore {
  onboardingDone: boolean;
  haptics: boolean;
  /** Rappels (série en danger, énergie rechargée). Demande la permission à l'activation. */
  reminders: boolean;
  reminderHour: number;
  setOnboardingDone: (done: boolean) => void;
  setHaptics: (on: boolean) => void;
  setReminders: (on: boolean) => void;
  setReminderHour: (hour: number) => void;
}

/** Réglages, séparés de la progression : « réinitialiser » ne les touche pas. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      onboardingDone: false,
      haptics: true,
      reminders: false,
      reminderHour: 19,
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setHaptics: (haptics) => set({ haptics }),
      setReminders: (reminders) => set({ reminders }),
      setReminderHour: (reminderHour) => set({ reminderHour }),
    }),
    { name: 'settings.v1', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
