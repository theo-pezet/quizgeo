/**
 * La machine à états d'une session : quels exercices, dans quel ordre, où en
 * est-on, et quoi écrire dans le store après chaque réponse.
 *
 * Pas de cœurs, pas de vies : une erreur ne punit pas, elle REVIENT. Les
 * exercices ratés sont reposés en fin de session (« rattrapage »), et la
 * carte du deck correspondante est replanifiée pour aujourd'hui.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { CATALOG } from '@/content';
import { content } from '@/content/useContent';
import { FEATURES } from '@/config/features';
import {
  applyAdShown,
  applyAnswerAction,
  applyCardReview,
  applySessionEnd,
  applySkipTestPassed,
  applyStartLesson,
  PATH_TRAITS,
  SKIP_TEST_MIN_SCORE,
  toDayKey,
  unitTraits,
  composeFreeSession,
  composeReviewSession,
  composeUnitSession,
  reviewQueue,
  shouldShowAd,
  type Exercise,
  type Progress,
  type SessionEndResult,
  type SessionMode,
} from '@/game';
import { ads } from '@/lib/ads';
import { useProgress } from '@/store/progress';

export type SessionSpec =
  | { mode: 'unit'; unitId: string; skipTest?: boolean }
  | { mode: 'review' }
  | { mode: 'free'; subjectId: string };

export interface Step {
  exercise: Exercise;
  /** Rattrapage : l'exercice a déjà été raté dans cette session. */
  retry: boolean;
}

export interface Feedback {
  correct: boolean;
  explain?: string;
}

export interface SessionState {
  steps: Step[];
  index: number;
  phase: 'question' | 'feedback' | 'done' | 'noEnergy';
  feedback: Feedback | null;
  /** Bonnes réponses sur les exercices du parcours principal (hors rattrapage). */
  correctCount: number;
  /** Nombre d'exercices du parcours principal. */
  mainCount: number;
  combo: number;
  bestCombo: number;
  result: SessionEndResult | null;
  adShown: boolean;
  /** Test de sortie : réussi (unités validées), raté, ou sans objet. */
  skipTest: { passed: boolean; validatedUnits: string[] } | null;
  /** XP au lancement, pour afficher le total gagné à la fin. */
  xpAtStart: number;
}

function compose(spec: SessionSpec, progress: Progress): Exercise[] {
  const rng = Math.random;
  const { exercisesOfUnit, exercisesOfSubject, EXERCISE_BY_KEY } = content();
  switch (spec.mode) {
    case 'unit':
      return composeUnitSession(exercisesOfUnit(spec.unitId), rng);
    case 'review':
      return composeReviewSession(reviewQueue(progress), EXERCISE_BY_KEY);
    case 'free':
      return composeFreeSession(exercisesOfSubject(spec.subjectId), rng);
  }
}

/**
 * Prélève l'énergie de la leçon et compose la file. Une seule fois par
 * session : le résultat est mémorisé dans un ref par l'appelant.
 */
function start(spec: SessionSpec): { steps: Step[]; started: boolean; startProgress: Progress; hard: boolean } {
  const store = useProgress.getState();
  const now = new Date();
  const started = applyStartLesson(store.progress, spec.mode, now);
  if (started === null) return { steps: [], started: false, startProgress: store.progress, hard: false };
  store.setProgress(started);
  // Mode maîtrise : dès 3 couronnes, les QCM typables se tapent.
  const hard = spec.mode === 'unit' && unitTraits(started, spec.unitId, content().EXERCISES, toDayKey(now)) >= PATH_TRAITS;
  return {
    steps: compose(spec, started).map((exercise) => ({ exercise, retry: false })),
    started: true,
    startProgress: started,
    hard,
  };
}

export function useSession(spec: SessionSpec) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(() => start(spec), []);
  const startProgress = useRef<Progress>(init.startProgress);
  const credited = useRef(new Set<string>());
  const retryQueue = useRef<Exercise[]>([]);
  const initialSteps = init.steps;

  const [state, setState] = useState<SessionState>({
    steps: initialSteps,
    index: 0,
    phase: !init.started ? 'noEnergy' : initialSteps.length === 0 ? 'done' : 'question',
    feedback: null,
    correctCount: 0,
    mainCount: initialSteps.length,
    combo: 0,
    bestCombo: 0,
    result: null,
    adShown: false,
    skipTest: null,
    xpAtStart: init.startProgress.xp,
  });

  const current: Step | undefined = state.steps[state.index];
  const mode: SessionMode = spec.mode;
  const unitId = spec.mode === 'unit' ? spec.unitId : null;

  /** L'exercice courant vient d'être répondu. */
  const answer = useCallback(
    (correct: boolean) => {
      if (!current || state.phase !== 'question') return;
      const now = new Date();
      const store = useProgress.getState();
      const key = current.exercise.key;

      let { progress } = applyAnswerAction(store.progress, {
        question: current.exercise,
        correct,
        mode,
        chrono: false,
        now,
        creditedThisSession: credited.current.has(key),
      });
      if (correct) credited.current.add(key);

      // Pont leçon → deck : une erreur replanifie la carte pour aujourd'hui.
      const cardId = current.exercise.cardId;
      if (!correct && cardId !== undefined) {
        progress = applyCardReview(progress, { cardId, grade: 'again', now }).progress;
      }
      store.setProgress(progress);

      if (!correct && !current.retry) retryQueue.current.push(current.exercise);

      setState((s) => ({
        ...s,
        phase: 'feedback',
        feedback: { correct, explain: current.exercise.explain },
        correctCount: s.correctCount + (correct && !current.retry ? 1 : 0),
        combo: correct ? s.combo + 1 : 0,
        bestCombo: correct ? Math.max(s.bestCombo, s.combo + 1) : s.bestCombo,
      }));
    },
    [current, mode, state.phase],
  );

  const finish = useCallback(
    (s: SessionState): SessionState => {
      const store = useProgress.getState();
      const now = new Date();
      const { EXERCISES } = content();
      const result = applySessionEnd(store.progress, {
        mode,
        unitId,
        questionCount: s.mainCount,
        correctCount: s.correctCount,
        chrono: false,
        now,
        questions: EXERCISES,
        catalog: CATALOG,
        bestCombo: s.bestCombo,
        progressAtSessionStart: startProgress.current,
      });
      let progress = result.progress;
      let skipTest: SessionState['skipTest'] = null;
      if (spec.mode === 'unit' && spec.skipTest) {
        const passed = s.correctCount >= SKIP_TEST_MIN_SCORE;
        const validatedUnits = passed ? applySkipTestPassed(progress, spec.unitId, EXERCISES, CATALOG, now) : null;
        if (validatedUnits) progress = validatedUnits.progress;
        skipTest = { passed, validatedUnits: validatedUnits?.validatedUnits ?? [] };
      }
      store.setProgress(progress);

      let adShown = false;
      if (shouldShowAd(result.progress, { mode, now, enabled: FEATURES.ads })) {
        // Le SDK décide s'il a quelque chose à montrer ; on ne compte que le réel.
        void ads.showInterstitial().then((outcome) => {
          if (outcome === 'shown') {
            const latest = useProgress.getState();
            latest.setProgress(applyAdShown(latest.progress, new Date()));
          }
        });
        adShown = true;
      }
      return { ...s, phase: 'done', feedback: null, result, adShown, skipTest };
    },
    [mode, unitId, spec],
  );

  /** « Continuer » après le retour sur la réponse. */
  const next = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'feedback') return s;
      const nextIndex = s.index + 1;
      if (nextIndex < s.steps.length) return { ...s, index: nextIndex, phase: 'question', feedback: null };
      if (retryQueue.current.length > 0) {
        const retries = retryQueue.current.map((exercise) => ({ exercise, retry: true }));
        retryQueue.current = [];
        return { ...s, steps: [...s.steps, ...retries], index: nextIndex, phase: 'question', feedback: null };
      }
      return finish(s);
    });
  }, [finish]);

  const ratio = state.steps.length === 0 ? 1 : Math.min(1, state.index / state.steps.length);

  return { state, current, answer, next, ratio, unitId, hard: init.hard };
}
