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
  applyCardLapse,
  applySessionEnd,
  applySkipTestPassed,
  applyStartLesson,
  applyTick,
  GEMS,
  PATH_TRAITS,
  questsReward,
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
  type Quest,
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
  /** Pourquoi la réponse choisie est fausse (propre à ce choix). */
  whyWrong?: string;
}

export interface SessionState {
  steps: Step[];
  index: number;
  /** `empty` : rien à poser (file de révision vide, unité inconnue). Rien n'est prélevé. */
  phase: 'question' | 'feedback' | 'done' | 'noEnergy' | 'empty';
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
 * Compose la file, puis prélève l'énergie de la leçon. Une seule fois par
 * session : le résultat est mémorisé par l'appelant. Une file vide ne coûte
 * rien : on le sait AVANT de prélever.
 */
function start(spec: SessionSpec): { steps: Step[]; started: boolean; empty: boolean; startProgress: Progress; hard: boolean } {
  const store = useProgress.getState();
  const now = new Date();
  const exercises = compose(spec, applyTick(store.progress, now));
  if (exercises.length === 0) return { steps: [], started: true, empty: true, startProgress: store.progress, hard: false };
  const started = applyStartLesson(store.progress, spec.mode, now);
  if (started === null) return { steps: [], started: false, empty: false, startProgress: store.progress, hard: false };
  store.setProgress(started);
  // Mode maîtrise : dès 3 couronnes, les QCM typables se tapent.
  const hard = spec.mode === 'unit' && unitTraits(started, spec.unitId, content().EXERCISES, toDayKey(now)) >= PATH_TRAITS;
  return {
    steps: exercises.map((exercise) => ({ exercise, retry: false })),
    started: true,
    empty: false,
    startProgress: started,
    hard,
  };
}

export function useSession(spec: SessionSpec) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(() => start(spec), []);
  const startProgress = useRef<Progress>(init.startProgress);
  // Lancement : une leçon finie après minuit compte pour la veille.
  const startedAt = useRef(new Date());
  const credited = useRef(new Set<string>());
  const retryQueue = useRef<Exercise[]>([]);
  // Quêtes et objectif du jour bouclés PAR une réponse : annoncés à la fin.
  const answerQuests = useRef<Quest[]>([]);
  const answerGoal = useRef(false);
  const initialSteps = init.steps;

  const [state, setState] = useState<SessionState>({
    steps: initialSteps,
    index: 0,
    phase: !init.started ? 'noEnergy' : init.empty ? 'empty' : 'question',
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
    (correct: boolean, whyWrong?: string) => {
      if (!current || state.phase !== 'question') return;
      const now = new Date();
      const store = useProgress.getState();
      const key = current.exercise.key;

      const r = applyAnswerAction(store.progress, {
        question: current.exercise,
        correct,
        mode,
        chrono: false,
        now,
        creditedThisSession: credited.current.has(key),
        skipTest: spec.mode === 'unit' && spec.skipTest === true,
      });
      let progress = r.progress;
      answerQuests.current = answerQuests.current.concat(r.questsCompleted);
      if (r.goalReached) answerGoal.current = true;
      if (correct) credited.current.add(key);

      // Pont leçon → deck : une erreur replanifie la carte pour aujourd'hui.
      // Seule la planification bouge : ce n'est pas une carte « révisée »
      // (ni compteur, ni quête du deck, ni XP).
      const cardId = current.exercise.cardId;
      if (!correct && cardId !== undefined) {
        progress = applyCardLapse(progress, cardId, now);
      }
      store.setProgress(progress);

      // Rattrapage : une fois par exercice, et plus du tout s'il a été réussi
      // entre-temps dans le parcours principal.
      if (!current.retry) {
        if (!correct && !retryQueue.current.some((e) => e.key === key)) retryQueue.current.push(current.exercise);
        if (correct) retryQueue.current = retryQueue.current.filter((e) => e.key !== key);
      }

      setState((s) => ({
        ...s,
        phase: 'feedback',
        feedback: { correct, explain: current.exercise.explain, whyWrong: correct ? undefined : whyWrong },
        correctCount: s.correctCount + (correct && !current.retry ? 1 : 0),
        combo: correct ? s.combo + 1 : 0,
        bestCombo: correct ? Math.max(s.bestCombo, s.combo + 1) : s.bestCombo,
      }));
    },
    [current, mode, spec, state.phase],
  );

  const finish = useCallback(
    (s: SessionState): SessionState => {
      const store = useProgress.getState();
      const now = new Date();
      const { EXERCISES } = content();
      const ended = applySessionEnd(store.progress, {
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
        startedAt: startedAt.current,
        skipTest: spec.mode === 'unit' && spec.skipTest === true,
      });
      // Les quêtes et l'objectif atteints pendant les réponses (gemmes déjà
      // créditées) rejoignent ceux de la fin, pour être annoncés.
      const extraQuests = answerQuests.current.filter((q) => !ended.questsCompleted.some((e) => e.id === q.id));
      const goalDuringAnswers = answerGoal.current && !ended.goalReached;
      const result: SessionEndResult = {
        ...ended,
        questsCompleted: [...extraQuests, ...ended.questsCompleted],
        goalReached: ended.goalReached || answerGoal.current,
        gemsGained: ended.gemsGained + questsReward(extraQuests) + (goalDuringAnswers ? GEMS.dailyGoal : 0),
      };
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

  // La barre suit le parcours principal (réponse comprise dès le verdict) et
  // ne recule jamais : le rattrapage la laisse pleine, avec son propre compteur.
  const answered = state.index + (state.phase === 'feedback' ? 1 : 0);
  const ratio = state.mainCount === 0 ? 1 : Math.min(1, answered / state.mainCount);
  const inRetry = state.index >= state.mainCount;
  const counter = inRetry
    ? { index: state.index - state.mainCount + 1, total: state.steps.length - state.mainCount }
    : { index: Math.min(state.index + 1, state.mainCount), total: state.mainCount };

  return { state, current, answer, next, ratio, counter, inRetry, unitId, hard: init.hard };
}
