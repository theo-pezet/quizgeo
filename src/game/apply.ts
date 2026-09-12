/**
 * Le réducteur : (état, action) → nouvel état.
 *
 * Sans lui, la composition des règles
 * (compteurs, XP, traits, série, badges, dans le bon ordre) retomberait dans
 * le store zustand, donc hors de la zone testée à 100 %. `src/store/progress.ts`
 * ne fait qu'appeler ces deux fonctions et persister le résultat.
 */

import { recordAdShown, recordSessionForAds } from './ads';
import { evaluateBadges, awardBadges, isEarlyHour, isNightHour, type BadgeId } from './badges';
import { localHour, toDayKey } from './dates';
import { allUnitTraits, applyUnitSessionResult, newlyUnlocked, unitTraits } from './mastery';
import { applyAnswer } from './review';
import { gradeIsCorrect, reviewCard, type Grade } from './srs';
import { recordActiveDay, sessionCountsForStreak } from './streak';
import { XP_CORRECT_REVIEW, addXp, isPerfectSession, levelUp, xpForAnswer, xpForSession } from './xp';
import {
  emptyUnitProgress,
  type Catalog,
  type Exercise,
  type Progress,
  type SessionMode,
  type Traits,
  type UnitId,
} from './types';

export interface AnswerAction {
  question: Exercise;
  correct: boolean;
  mode: SessionMode;
  chrono: boolean;
  now: Date;
  /**
   * La question a-t-elle DÉJÀ reçu une bonne réponse dans la session en cours ?
   *
   * Une unité de 4 questions repose chacune 2 à 3 fois en 10. Sans ce drapeau,
   * un seul 10/10 porterait toutes les questions à streak 2-3 (3 traits et
   * badge « Surligneur » dès la première session), et une question ratée
   * sortirait de la file de révision dans la session même où elle est entrée.
   *
   * Règle retenue (validée) : une bonne réponse ne fait
   * progresser le streak qu'une fois par question et par session ; une erreur
   * compte toujours. Les XP, eux, sont crédités à chaque bonne réponse.
   * L'écran de session tient un Set des clés déjà créditées.
   */
  creditedThisSession: boolean;
}

export interface AnswerResult {
  progress: Progress;
  xpGained: number;
  enteredQueue: boolean;
  leftQueue: boolean;
}

/**
 * Une réponse. Persistée immédiatement par l'appelant : une fermeture forcée
 * ne doit pas coûter plus d'une question .
 *
 * Les traits sont recalculés ici — c'est l'état qui bouge à chaque réponse ;
 * seule l'ANIMATION de gain attend la fin de session.
 */
export function applyAnswerAction(progress: Progress, action: AnswerAction): AnswerResult {
  const nowIso = action.now.toISOString();
  const outcome = applyAnswer(
    progress.questions[action.question.key],
    action.question.key,
    action.correct,
    nowIso,
    action.creditedThisSession,
  );

  const xpGained = xpForAnswer({
    mode: action.mode,
    correct: action.correct,
    chrono: action.chrono,
  });

  return {
    progress: {
      ...progress,
      xp: addXp(progress.xp, xpGained),
      questions: { ...progress.questions, [action.question.key]: outcome.progress },
      counters: {
        ...progress.counters,
        reviewRecovered: progress.counters.reviewRecovered + (outcome.leftQueue ? 1 : 0),
      },
    },
    xpGained,
    enteredQueue: outcome.enteredQueue,
    leftQueue: outcome.leftQueue,
  };
}

export interface SessionEndAction {
  mode: SessionMode;
  /** Renseigné pour `mode === 'unit'` uniquement. */
  unitId: UnitId | null;
  questionCount: number;
  correctCount: number;
  chrono: boolean;
  now: Date;
  /** Tous les exercices courants, pour recalculer couronnes et déverrouillages. */
  questions: readonly Exercise[];
  catalog: Catalog;
  /**
   * L'état AVANT la première question de la session. Obligatoire : les
   * réponses sont appliquées une à une (applyAnswerAction), donc à la fin de
   * session `progress` contient déjà leurs effets. Mesurer « avant » sur
   * `progress` ferait rater les passages de niveau (XP déjà crédités), les
   * traits gagnés pendant les réponses (animation jamais jouée) et les
   * déverrouillages qu'ils provoquent (4 bonnes réponses sur une unité
   * Facile suffisent à ouvrir Moyen, avant même la fin de session).
   * Le store garde simplement une référence à l'état au lancement.
   */
  progressAtSessionStart: Progress;
}

export interface SessionEndResult {
  progress: Progress;
  xpGained: number;
  levelUp: { crossed: boolean; from: number; to: number };
  traitsBefore: Traits;
  traitsAfter: Traits;
  streakIncremented: boolean;
  freezeConsumedFor: string | null;
  newBadges: BadgeId[];
  newlyUnlockedUnits: UnitId[];
}

/**
 * Fin de session. L'ordre compte : compteurs et unité d'abord, série ensuite,
 * badges en dernier — un badge ne doit jamais être évalué sur un état à moitié
 * écrit (sinon « Une semaine » manquerait la session qui vient de le mériter).
 */
export function applySessionEnd(
  progress: Progress,
  action: SessionEndAction,
): SessionEndResult {
  const {
    mode,
    unitId,
    questionCount,
    correctCount,
    chrono,
    now,
    questions,
    catalog,
    progressAtSessionStart,
  } = action;

  // « Avant » = au lancement de la session, pas maintenant : les réponses ont
  // déjà été appliquées une à une.
  const traitsMapBefore = allUnitTraits(progressAtSessionStart, questions, catalog);
  const traitsBefore = unitId ? (traitsMapBefore[unitId] ?? 0) : 0;

  const nowIso = now.toISOString();
  const hour = localHour(now);
  const perfect = isPerfectSession(questionCount, correctCount);

  // 1. Les XP. Les réponses ont déjà été créditées une à une : on n'ajoute ici
  //    que les bonus de session, jamais doublés par le chrono.
  const breakdown = xpForSession({ mode, questionCount, correctCount, chrono });
  const bonusXp = breakdown.completion + breakdown.perfect;
  const xpBefore = progressAtSessionStart.xp;
  let next: Progress = { ...progress, xp: addXp(progress.xp, bonusXp) };

  // 2. Les compteurs.
  next = {
    ...next,
    counters: {
      ...next.counters,
      sessionsCompleted: next.counters.sessionsCompleted + 1,
      perfectSessions: next.counters.perfectSessions + (perfect ? 1 : 0),
      chronoPerfects: next.counters.chronoPerfects + (perfect && chrono ? 1 : 0),
      earlySessions: next.counters.earlySessions + (isEarlyHour(hour) ? 1 : 0),
      nightSessions: next.counters.nightSessions + (isNightHour(hour) ? 1 : 0),
    },
    ads: recordSessionForAds(next.ads),
  };

  // 3. L'unité, si c'était une session d'unité.
  if (unitId) {
    const unitKeys = questions.filter((q) => q.unitId === unitId).map((q) => q.key);
    const allSeen =
      unitKeys.length > 0 &&
      unitKeys.every((key) => (next.questions[key]?.seen ?? 0) >= 1);
    const previous = next.units[unitId] ?? emptyUnitProgress(unitId);

    next = {
      ...next,
      units: {
        ...next.units,
        [unitId]: applyUnitSessionResult(previous, unitId, {
          score: correctCount,
          questionCount,
          allQuestionsSeen: allSeen,
          computedTraitsAtLeast2: unitTraits(next, unitId, questions) >= 2,
        }),
      },
    };
  }

  // 4. La série. Une session trop courte ne la nourrit pas.
  let streakIncremented = false;
  let freezeConsumedFor: string | null = null;
  if (sessionCountsForStreak(questionCount)) {
    const update = recordActiveDay(next.streak, toDayKey(now));
    next = { ...next, streak: update.streak };
    streakIncremented = update.incremented;
    freezeConsumedFor = update.freezeConsumedFor;
  }

  // 5. Les traits, une fois tout le reste écrit.
  const traitsMapAfter = allUnitTraits(next, questions, catalog);
  const traitsAfter = unitId ? (traitsMapAfter[unitId] ?? 0) : 0;

  // 6. Les badges, en dernier.
  const newBadges = evaluateBadges({ progress: next, traitsByUnit: traitsMapAfter, catalog });
  next = { ...next, badges: awardBadges(next.badges, newBadges, nowIso) };

  return {
    progress: next,
    xpGained: bonusXp,
    levelUp: levelUp(xpBefore, next.xp),
    traitsBefore,
    traitsAfter,
    streakIncremented,
    freezeConsumedFor,
    newBadges,
    newlyUnlockedUnits: newlyUnlocked(traitsMapBefore, traitsMapAfter, catalog),
  };
}

/** Ouverture d'un lien source. Peut décrocher le badge « Lecteur ». */
export function applySourceOpened(
  progress: Progress,
  questions: readonly Exercise[],
  catalog: Catalog,
  now: Date,
): { progress: Progress; newBadges: BadgeId[] } {
  const next: Progress = {
    ...progress,
    counters: { ...progress.counters, sourcesOpened: progress.counters.sourcesOpened + 1 },
  };
  const traitsByUnit = allUnitTraits(next, questions, catalog);
  const newBadges = evaluateBadges({ progress: next, traitsByUnit, catalog });
  return {
    progress: { ...next, badges: awardBadges(next.badges, newBadges, now.toISOString()) },
    newBadges,
  };
}

export interface CardReviewAction {
  cardId: string;
  grade: Grade;
  now: Date;
}

export interface CardReviewResult {
  progress: Progress;
  xpGained: number;
  correct: boolean;
}

/**
 * Une carte du deck révisée. Persistée immédiatement, comme une réponse.
 * « Encore » ne rapporte rien ; les trois autres réponses valent une bonne
 * réponse de révision (5 XP).
 */
export function applyCardReview(progress: Progress, action: CardReviewAction): CardReviewResult {
  const correct = gradeIsCorrect(action.grade);
  const xpGained = correct ? XP_CORRECT_REVIEW : 0;
  const card = reviewCard(
    progress.cards[action.cardId],
    action.cardId,
    action.grade,
    toDayKey(action.now),
    action.now.toISOString(),
  );
  return {
    progress: {
      ...progress,
      xp: addXp(progress.xp, xpGained),
      cards: { ...progress.cards, [action.cardId]: card },
      counters: { ...progress.counters, cardsReviewed: progress.counters.cardsReviewed + 1 },
    },
    xpGained,
    correct,
  };
}

/** Une publicité a été affichée : on remet les compteurs d'espacement à zéro. */
export function applyAdShown(progress: Progress, now: Date): Progress {
  return { ...progress, ads: recordAdShown(progress.ads, now.toISOString()) };
}
