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
  effectiveStreak,
  reviewQueue,
  pickPretest,
  shouldRelearn,
  shouldShowAd,
  sureAllowed,
  unitStarted,
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
  /** Prétest : question posée AVANT la leçon, sans aucune conséquence (voir learning.ts). */
  pretest?: boolean;
}

export interface Feedback {
  correct: boolean;
  /** Réponse d'un prétest : se tromper est normal et utile. */
  pretest?: boolean;
  /** Erreur commise en se disant « sûr » : elle passe en tête de la file « à revoir ». */
  confidentMiss?: boolean;
  explain?: string;
  /** Pourquoi la réponse choisie est fausse (propre à ce choix). */
  whyWrong?: string;
  /** La réponse donnée, en texte, quand l'exercice sait la dire (pour « Ask Claude »). */
  given?: string;
}

export interface SessionState {
  steps: Step[];
  index: number;
  /** `empty` : rien à poser (file de révision vide, unité inconnue). Rien n'est prélevé. */
  phase: 'question' | 'feedback' | 'done' | 'noEnergy' | 'empty';
  feedback: Feedback | null;
  /**
   * Le verdict de la question précédente, pour la revoir (bouton « question
   * précédente ») : on passe parfois trop vite sur une erreur.
   */
  previousFeedback: Feedback | null;
  /** Bonnes réponses sur les exercices du parcours principal (hors rattrapage). */
  correctCount: number;
  /** Nombre d'exercices du parcours principal. */
  mainCount: number;
  /** Questions de prétest en tête de session (hors parcours principal). */
  pretestCount: number;
  combo: number;
  bestCombo: number;
  result: SessionEndResult | null;
  adShown: boolean;
  /** Test de sortie : réussi (unités validées), raté, ou sans objet. */
  skipTest: { passed: boolean; validatedUnits: string[] } | null;
  /** XP au lancement, pour afficher le total gagné à la fin. */
  xpAtStart: number;
}

const SUBJECT_OF_UNIT: ReadonlyMap<string, string> = new Map(CATALOG.units.map((u) => [u.id, u.subjectId]));

function compose(spec: SessionSpec, progress: Progress): Exercise[] {
  const rng = Math.random;
  const { exercisesOfUnit, exercisesOfSubject, EXERCISE_BY_KEY } = content();
  switch (spec.mode) {
    case 'unit': {
      // Test de sortie : un examen tiré au hasard, comme avant.
      if (spec.skipTest) return composeUnitSession(exercisesOfUnit(spec.unitId), rng);
      // Les leçons posent d'abord ce qu'on sait le moins (jamais vu, raté,
      // puis streak croissant) ; la première suit l'ordre de rédaction.
      const today = toDayKey(new Date());
      const strength = (e: Exercise) => {
        const q = progress.questions[e.key];
        return q === undefined || q.seen === 0 ? -0.5 : effectiveStreak(q, today);
      };
      return composeUnitSession(exercisesOfUnit(spec.unitId), rng, undefined, { strength, firstTime: !unitStarted(progress, spec.unitId) });
    }
    case 'review':
      // Entrelacées par matière (voir learning.ts).
      return composeReviewSession(reviewQueue(progress), EXERCISE_BY_KEY, undefined, (e) => SUBJECT_OF_UNIT.get(e.unitId) ?? e.unitId);
    case 'free':
      return composeFreeSession(exercisesOfSubject(spec.subjectId), rng);
  }
}

/**
 * Compose la file, puis prélève l'énergie de la leçon. Une seule fois par
 * session : le résultat est mémorisé par l'appelant. Une file vide ne coûte
 * rien : on le sait AVANT de prélever.
 */
function start(spec: SessionSpec): { steps: Step[]; started: boolean; empty: boolean; startProgress: Progress; hard: boolean; pretestCount: number } {
  const store = useProgress.getState();
  const now = new Date();
  const exercises = compose(spec, applyTick(store.progress, now));
  if (exercises.length === 0) return { steps: [], started: true, empty: true, startProgress: store.progress, hard: false, pretestCount: 0 };
  const started = applyStartLesson(store.progress, spec.mode, now);
  if (started === null) return { steps: [], started: false, empty: false, startProgress: store.progress, hard: false, pretestCount: 0 };
  store.setProgress(started);
  // Mode maîtrise : dès 3 couronnes, les QCM typables se tapent.
  const hard = spec.mode === 'unit' && unitTraits(started, spec.unitId, content().EXERCISES, toDayKey(now)) >= PATH_TRAITS;
  // Prétest : une unité jamais commencée s'ouvre sur deux questions de la leçon.
  const pretest = spec.mode === 'unit' && !spec.skipTest ? pickPretest(exercises, unitStarted(started, spec.unitId)) : [];
  return {
    steps: [...pretest.map((exercise) => ({ exercise, retry: false, pretest: true })), ...exercises.map((exercise) => ({ exercise, retry: false }))],
    started: true,
    empty: false,
    startProgress: started,
    hard,
    pretestCount: pretest.length,
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
  // Erreurs par exercice dans la séance : réapprentissage jusqu'au critère.
  const fails = useRef(new Map<string, number>());
  // Réponses déjà dévoilées dans la séance (erreur, ou question du prétest) :
  // « I'm sure » n'y est plus proposé.
  const revealed = useRef(new Set<string>());
  // Quêtes et objectif du jour bouclés PAR une réponse : annoncés à la fin.
  const answerQuests = useRef<Quest[]>([]);
  const answerGoal = useRef(false);
  const initialSteps = init.steps;

  const [state, setState] = useState<SessionState>({
    steps: initialSteps,
    index: 0,
    phase: !init.started ? 'noEnergy' : init.empty ? 'empty' : 'question',
    feedback: null,
    previousFeedback: null,
    correctCount: 0,
    mainCount: initialSteps.length - init.pretestCount,
    pretestCount: init.pretestCount,
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

  // « I'm sure » est-il proposé sur l'exercice courant ? Lu au rendu : la
  // progression enregistrée ne change qu'au moment de la réponse.
  const storedQuestion = useProgress((s) => (current ? s.progress.questions[current.exercise.key] : undefined));
  const canBeSure =
    current !== undefined &&
    !current.pretest &&
    sureAllowed({ question: storedQuestion, revealedThisSession: revealed.current.has(current.exercise.key), retry: current.retry, today: toDayKey(new Date()) });

  /** L'exercice courant vient d'être répondu. */
  const answer = useCallback(
    (correct: boolean, whyWrong?: string, confident = false, given?: string) => {
      if (!current || state.phase !== 'question') return;
      // Prétest : aucune conséquence, seulement le verdict et l'explication.
      if (current.pretest) {
        revealed.current.add(current.exercise.key);
        setState((s) => ({ ...s, phase: 'feedback', feedback: { correct, pretest: true, explain: current.exercise.explain, whyWrong: correct ? undefined : whyWrong, given } }));
        return;
      }
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
        // « Sûr » ne compte que là où il est proposé (voir sureAllowed).
        confident: confident && canBeSure,
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

      // Rattrapage jusqu'au critère : un exercice raté revient en fin de
      // séance, jusqu'à une bonne réponse (au plus RELEARN_MAX retours), et
      // plus du tout s'il a été réussi entre-temps dans le parcours principal.
      if (!correct) {
        revealed.current.add(key);
        const n = (fails.current.get(key) ?? 0) + 1;
        fails.current.set(key, n);
        if (shouldRelearn(n) && !retryQueue.current.some((e) => e.key === key)) retryQueue.current.push(current.exercise);
      } else if (!current.retry) {
        retryQueue.current = retryQueue.current.filter((e) => e.key !== key);
      }

      setState((s) => ({
        ...s,
        phase: 'feedback',
        feedback: { correct, explain: current.exercise.explain, whyWrong: correct ? undefined : whyWrong, confidentMiss: !correct && confident && canBeSure, given },
        correctCount: s.correctCount + (correct && !current.retry ? 1 : 0),
        combo: correct ? s.combo + 1 : 0,
        bestCombo: correct ? Math.max(s.bestCombo, s.combo + 1) : s.bestCombo,
      }));
    },
    [current, mode, spec, state.phase, canBeSure],
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
      if (nextIndex < s.steps.length) return { ...s, index: nextIndex, phase: 'question', feedback: null, previousFeedback: s.feedback };
      if (retryQueue.current.length > 0) {
        const retries = retryQueue.current.map((exercise) => ({ exercise, retry: true }));
        retryQueue.current = [];
        return { ...s, steps: [...s.steps, ...retries], index: nextIndex, phase: 'question', feedback: null, previousFeedback: s.feedback };
      }
      return finish(s);
    });
  }, [finish]);

  // La barre suit le parcours principal (réponse comprise dès le verdict) et
  // ne recule jamais : le rattrapage la laisse pleine, avec son propre compteur.
  // Le prétest précède le parcours : la barre reste à zéro pendant ce temps.
  const pre = state.pretestCount;
  const inPretest = state.index < pre;
  const answered = Math.max(0, state.index - pre + (state.phase === 'feedback' ? 1 : 0));
  const ratio = state.mainCount === 0 ? 1 : inPretest ? 0 : Math.min(1, answered / state.mainCount);
  const inRetry = state.index >= pre + state.mainCount;
  const counter = inPretest
    ? { index: state.index + 1, total: pre }
    : inRetry
      ? { index: state.index - pre - state.mainCount + 1, total: state.steps.length - pre - state.mainCount }
      : { index: Math.min(state.index - pre + 1, state.mainCount), total: state.mainCount };

  // La question précédente et son verdict, en lecture seule.
  const previous: { step: Step; feedback: Feedback } | null =
    state.index > 0 && state.previousFeedback && state.steps[state.index - 1] ? { step: state.steps[state.index - 1], feedback: state.previousFeedback } : null;

  return { state, current, previous, answer, next, ratio, counter, inRetry, inPretest, unitId, hard: init.hard, canBeSure };
}
