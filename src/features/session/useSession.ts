/**
 * La machine à états d'une session : quels exercices, dans quel ordre, où en
 * est-on, et quoi écrire dans le store après chaque réponse.
 *
 * Pas de cœurs, pas de vies : une erreur ne punit pas, elle REVIENT. Les
 * exercices ratés sont reposés en fin de session (« rattrapage »), et la
 * carte du deck correspondante est replanifiée pour aujourd'hui.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { CATALOG, type Card } from '@/content';
import { resolveUnitCards } from '@/content/generate';
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
  HANDWRITTEN,
  TYPED_FROM_TRAITS,
  questsReward,
  SKIP_TEST_MIN_SCORE,
  toDayKey,
  unitTraits,
  composeFreeSession,
  composeReviewSession,
  composeUnitSession,
  effectiveStreak,
  guidedLeft,
  reviewQueue,
  pickPretest,
  shouldPromptExplain,
  shouldRelearn,
  shouldShowAd,
  sureAllowed,
  unitStarted,
  weaveLearn,
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

export interface QuestionStep {
  exercise: Exercise;
  /** Rattrapage : l'exercice a déjà été raté dans cette session. */
  retry: boolean;
  /** Prétest : question posée AVANT la leçon, sans aucune conséquence (voir learning.ts). */
  pretest?: boolean;
  learn?: undefined;
}

/** Fiche « New » : une notion et son exemple, à lire avant d'être interrogé dessus (voir learning.ts). */
export interface LearnStep {
  learn: Card;
  exercise?: undefined;
  retry: false;
  pretest?: false;
}

export type Step = QuestionStep | LearnStep;

/** Une question du parcours principal (ni fiche, ni prétest, ni rattrapage). */
function isMain(step: Step): boolean {
  return step.learn === undefined && step.pretest !== true && !step.retry;
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
  /** Auto-explication : l'explication reste cachée derrière « Why is it right? » (voir learning.ts). */
  explainPrompt?: boolean;
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

/** La carte prise à tort pour la bonne, sur une question de vocabulaire (voir duels.ts). */
function confusedWith(exercise: Exercise, correct: boolean, given: string | undefined): string | undefined {
  if (correct || given === undefined || exercise.kind !== 'qcm' || !exercise.choiceCards) return undefined;
  const index = exercise.choices.indexOf(given);
  return index >= 0 && index !== exercise.answer ? exercise.choiceCards[index] : undefined;
}

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
    case 'review': {
      // Plafond quotidien (voir guided.ts), puis entrelacées par matière (voir learning.ts).
      const today = toDayKey(new Date());
      const left = guidedLeft(progress, today).review;
      return composeReviewSession(reviewQueue(progress, today), EXERCISE_BY_KEY, left, (e) => SUBJECT_OF_UNIT.get(e.unitId) ?? e.unitId);
    }
    case 'free':
      return composeFreeSession(exercisesOfSubject(spec.subjectId), rng);
  }
}

/**
 * Compose la file, puis prélève l'énergie de la leçon. Une seule fois par
 * session : le résultat est mémorisé par l'appelant. Une file vide ne coûte
 * rien : on le sait AVANT de prélever.
 */
function start(spec: SessionSpec): { steps: Step[]; started: boolean; empty: boolean; startProgress: Progress; hard: boolean; pretestCount: number; mainCount: number } {
  const store = useProgress.getState();
  const now = new Date();
  const exercises = compose(spec, applyTick(store.progress, now));
  if (exercises.length === 0) return { steps: [], started: true, empty: true, startProgress: store.progress, hard: false, pretestCount: 0, mainCount: 0 };
  const started = applyStartLesson(store.progress, spec.mode, now);
  if (started === null) return { steps: [], started: false, empty: false, startProgress: store.progress, hard: false, pretestCount: 0, mainCount: 0 };
  store.setProgress(started);
  // Rappel plutôt que reconnaissance : dès la 1re couronne, les QCM typables se tapent.
  const hard = spec.mode === 'unit' && unitTraits(started, spec.unitId, content().EXERCISES, toDayKey(now)) >= TYPED_FROM_TRAITS;
  const lesson = spec.mode === 'unit' && !spec.skipTest;
  const firstTime = lesson && !unitStarted(started, spec.unitId);
  // Prétest : une unité jamais commencée s'ouvre sur deux questions de la leçon.
  const pretest = lesson ? pickPretest(exercises, !firstTime) : [];
  // Première leçon : les fiches « New » de l'unité s'intercalent entre les questions.
  const { UNIT_BY_ID, CARDS } = content();
  const unit = spec.mode === 'unit' ? UNIT_BY_ID.get(spec.unitId) : undefined;
  const cards = firstTime && unit ? resolveUnitCards(unit, CARDS) : [];
  const main: Step[] = weaveLearn(cards, exercises).map((x) => ('learn' in x ? { learn: x.learn, retry: false } : { exercise: x.question, retry: false }));
  return {
    steps: [...pretest.map((exercise) => ({ exercise, retry: false, pretest: true })), ...main],
    started: true,
    empty: false,
    startProgress: started,
    hard,
    pretestCount: pretest.length,
    mainCount: exercises.length,
  };
}

export function useSession(spec: SessionSpec) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(() => start(spec), []);
  const startProgress = useRef<Progress>(init.startProgress);
  // Lancement : une leçon finie après minuit compte pour la veille.
  const startedAt = useRef(new Date());
  const credited = useRef(new Set<string>());
  // Temps d'étude : crédité à chaque réponse, depuis la précédente (plafonné par study.ts).
  const lastMark = useRef(Date.now());
  const retryQueue = useRef<Exercise[]>([]);
  // Erreurs par exercice dans la séance : réapprentissage jusqu'au critère.
  const fails = useRef(new Map<string, number>());
  // Réponses déjà dévoilées dans la séance (erreur, ou question du prétest) :
  // « I'm sure » n'y est plus proposé.
  const revealed = useRef(new Set<string>());
  // Bonnes réponses éligibles à l'auto-explication (voir shouldPromptExplain).
  const explainable = useRef(0);
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
    mainCount: init.mainCount,
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
  const storedQuestion = useProgress((s) => (current?.exercise ? s.progress.questions[current.exercise.key] : undefined));
  const canBeSure =
    current !== undefined &&
    current.learn === undefined &&
    !current.pretest &&
    sureAllowed({ question: storedQuestion, revealedThisSession: revealed.current.has(current.exercise.key), retry: current.retry, today: toDayKey(new Date()) });

  /** L'exercice courant vient d'être répondu. */
  const answer = useCallback(
    (correct: boolean, whyWrong?: string, confident = false, given?: string) => {
      if (!current || current.learn !== undefined || state.phase !== 'question') return;
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
        retry: current.retry,
        // « Sûr » ne compte que là où il est proposé (voir sureAllowed).
        confident: confident && canBeSure,
        studySeconds: (now.getTime() - lastMark.current) / 1000,
        subjectId: SUBJECT_OF_UNIT.get(current.exercise.unitId),
        confusedWith: confusedWith(current.exercise, correct, given),
      });
      lastMark.current = now.getTime();
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

      // Auto-explication : une bonne réponse éligible sur SELF_EXPLAIN_EVERY.
      let explainPrompt = false;
      if (correct && !current.retry && current.exercise.explain && HANDWRITTEN.test(key)) {
        explainable.current += 1;
        explainPrompt = shouldPromptExplain(explainable.current);
      }

      setState((s) => ({
        ...s,
        phase: 'feedback',
        feedback: { correct, explain: current.exercise.explain, whyWrong: correct ? undefined : whyWrong, confidentMiss: !correct && confident && canBeSure, given, explainPrompt },
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

  /** « Continuer » après le retour sur la réponse, ou après une fiche « New ». */
  const next = useCallback(() => {
    setState((s) => {
      const onLearn = s.phase === 'question' && s.steps[s.index]?.learn !== undefined;
      if (s.phase !== 'feedback' && !onLearn) return s;
      const nextIndex = s.index + 1;
      if (nextIndex < s.steps.length) return { ...s, index: nextIndex, phase: 'question', feedback: null, previousFeedback: s.feedback };
      if (retryQueue.current.length > 0) {
        const retries: Step[] = retryQueue.current.map((exercise) => ({ exercise, retry: true }));
        retryQueue.current = [];
        return { ...s, steps: [...s.steps, ...retries], index: nextIndex, phase: 'question', feedback: null, previousFeedback: s.feedback };
      }
      return finish(s);
    });
  }, [finish]);

  // La barre suit le parcours principal (réponse comprise dès le verdict) et
  // ne recule jamais : le rattrapage la laisse pleine, avec son propre compteur.
  // Le prétest précède le parcours : la barre reste à zéro pendant ce temps.
  // Les fiches « New » ne comptent pas.
  const pre = state.pretestCount;
  const inPretest = current?.pretest === true;
  const inRetry = current?.retry === true;
  const before = state.steps.slice(0, state.index);
  const mainBefore = before.filter(isMain).length;
  const answered = mainBefore + (state.phase === 'feedback' && current !== undefined && isMain(current) ? 1 : 0);
  const ratio = state.mainCount === 0 ? 1 : inPretest ? 0 : Math.min(1, answered / state.mainCount);
  const retryTotal = state.steps.filter((st) => st.retry).length;
  const counter = inPretest
    ? { index: state.index + 1, total: pre }
    : inRetry
      ? { index: before.filter((st) => st.retry).length + 1, total: retryTotal }
      : { index: Math.min(mainBefore + 1, state.mainCount), total: state.mainCount };

  // La question précédente et son verdict, en lecture seule.
  const prevStep = state.steps[state.index - 1];
  const previous: { step: QuestionStep; feedback: Feedback } | null =
    state.index > 0 && state.previousFeedback && prevStep?.exercise !== undefined ? { step: prevStep, feedback: state.previousFeedback } : null;

  return { state, current, previous, answer, next, ratio, counter, inRetry, inPretest, unitId, hard: init.hard, canBeSure };
}
