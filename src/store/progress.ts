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

import { applySetDailyGoal, applyTick, emptyProgress, migratePersistedProgress, migrateProgress, type Progress } from '@/game';

interface ProgressStore {
  progress: Progress;
  hydrated: boolean;
  setProgress: (progress: Progress) => void;
  /** Remet l'état au présent (quêtes du jour, ligue, énergie régénérée). */
  tick: () => void;
  /**
   * « Réinitialiser ma progression » : repart de zéro en gardant l'objectif
   * quotidien choisi (un réglage), et efface les résultats des tests de niveau.
   */
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
      reset: () => {
        set((state) => ({
          progress: applyTick(applySetDailyGoal(emptyProgress(), state.progress.daily.goal), new Date()),
        }));
        useSettings.getState().clearPlacements();
      },
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'progress.v1',
      // v3 (1.1) : les exercices « lis le code » ajoutés aux unités existantes
      // héritent du niveau de leur unité (voir grandfatherNewExercises).
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ progress: state.progress }),
      // Appelé par zustand seulement quand la version stockée diffère : les
      // transformations datées, une seule fois.
      migrate: (persisted, version) => {
        const raw = (persisted as { progress?: unknown } | undefined)?.progress;
        return { progress: migratePersistedProgress(raw, version) } as unknown as ProgressStore;
      },
      // Appelé à CHAQUE hydratation : on complète toujours les champs
      // manquants (un champ ajouté sans changer de version ne doit jamais
      // faire planter l'app). Rien de stocké : l'état initial reste.
      merge: (persisted, current) => {
        const raw = (persisted as { progress?: unknown } | undefined)?.progress;
        if (raw === undefined) return current;
        return { ...current, progress: migrateProgress(raw) };
      },
      // Quoi qu'il arrive (lecture impossible, état illisible), l'app doit
      // démarrer : `hydrated` passe toujours à true.
      onRehydrateStorage: () => (_state, error) => {
        try {
          if (error === undefined) useProgress.getState().tick();
        } catch {
          // Un état qu'on ne sait pas remettre au présent reste tel quel.
        } finally {
          useProgress.setState({ hydrated: true });
        }
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
  clearPlacements: () => void;
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
      clearPlacements: () => set({ placements: {} }),
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
      // Même en cas d'erreur de lecture : sinon l'onboarding ne s'ouvre jamais.
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    },
  ),
);
