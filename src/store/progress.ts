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

export type SettingsLang = 'fr' | 'en' | 'es';

export interface PlacementRecord {
  score: number;
  total: number;
  self: number;
  skip: number;
  at: string;
}

interface SettingsStore {
  /** Langue de l'interface et du contenu ; null tant que l'utilisateur n'a pas choisi. */
  lang: SettingsLang | null;
  onboardingDone: boolean;
  haptics: boolean;
  /** Rappels (série en danger, énergie rechargée). Demande la permission à l'activation. */
  reminders: boolean;
  reminderHour: number;
  sound: boolean;
  /** Matière ouverte par défaut sur le parcours. */
  favoriteSubject: string | null;
  /** Matières que l'utilisateur veut voir ; null = toutes. */
  subjects: string[] | null;
  /** Le mini-tuto du parcours a été vu. */
  tutorialDone: boolean;
  /** Résultats des tests de niveau, par matière. */
  placements: Record<string, PlacementRecord>;
  /** Les réglages ont été relus depuis le disque. */
  hydrated: boolean;
  setLang: (lang: SettingsLang) => void;
  setOnboardingDone: (done: boolean) => void;
  setHaptics: (on: boolean) => void;
  setReminders: (on: boolean) => void;
  setReminderHour: (hour: number) => void;
  setSound: (on: boolean) => void;
  setFavoriteSubject: (id: string | null) => void;
  setSubjects: (ids: string[] | null) => void;
  setTutorialDone: (done: boolean) => void;
  setPlacement: (subjectId: string, record: PlacementRecord) => void;
  markHydrated: () => void;
}

/** Réglages, séparés de la progression : « réinitialiser » ne les touche pas. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      lang: null,
      onboardingDone: false,
      haptics: true,
      reminders: false,
      reminderHour: 19,
      sound: true,
      favoriteSubject: null,
      subjects: null,
      tutorialDone: false,
      placements: {},
      hydrated: false,
      setLang: (lang) => set({ lang }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setHaptics: (haptics) => set({ haptics }),
      setReminders: (reminders) => set({ reminders }),
      setReminderHour: (reminderHour) => set({ reminderHour }),
      setSound: (sound) => set({ sound }),
      setFavoriteSubject: (favoriteSubject) => set({ favoriteSubject }),
      setSubjects: (subjects) => set({ subjects }),
      setTutorialDone: (tutorialDone) => set({ tutorialDone }),
      setPlacement: (subjectId, record) => set((state) => ({ placements: { ...state.placements, [subjectId]: record } })),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'settings.v1',
      version: 2,
      // v2 : la matière « web » est devenue html / css / js.
      migrate: (persisted) => {
        const raw = (persisted ?? {}) as Record<string, unknown>;
        const favorite = raw.favoriteSubject === 'web' ? 'html' : raw.favoriteSubject;
        const subjects = Array.isArray(raw.subjects) ? raw.subjects.flatMap((s) => (s === 'web' ? ['html', 'css', 'js'] : [s])) : null;
        return { ...raw, favoriteSubject: favorite ?? null, subjects } as unknown as SettingsStore;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lang: state.lang,
        onboardingDone: state.onboardingDone,
        haptics: state.haptics,
        reminders: state.reminders,
        reminderHour: state.reminderHour,
        sound: state.sound,
        favoriteSubject: state.favoriteSubject,
        subjects: state.subjects,
        tutorialDone: state.tutorialDone,
        placements: state.placements,
      }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
