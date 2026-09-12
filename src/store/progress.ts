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

import { emptyProgress, type Progress } from '@/game';

interface ProgressStore {
  progress: Progress;
  hydrated: boolean;
  setProgress: (progress: Progress) => void;
  reset: () => void;
  markHydrated: () => void;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set) => ({
      progress: emptyProgress(),
      hydrated: false,
      setProgress: (progress) => set({ progress }),
      reset: () => set({ progress: emptyProgress() }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'progress.v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ progress: state.progress }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);

interface SettingsStore {
  onboardingDone: boolean;
  haptics: boolean;
  setOnboardingDone: (done: boolean) => void;
  setHaptics: (on: boolean) => void;
}

/** Réglages, séparés de la progression : « réinitialiser » ne les touche pas. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      onboardingDone: false,
      haptics: true,
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: 'settings.v1', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
