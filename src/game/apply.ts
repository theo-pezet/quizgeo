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
import { creditDailyXp, dailyRatio, ensureDaily } from './daily';
import { localHour, toDayKey } from './dates';
import { GEMS, SHOP, addGems, spendGems, streakMilestoneGems, xpMultiplier } from './economy';
import {
  LESSON_ENERGY_COST,
  MISTAKE_ENERGY_COST,
  PERFECT_ENERGY_REFUND,
  canStartLesson,
  modeCostsEnergy,
  refillEnergy,
  refundEnergy,
  settleEnergy,
  spendEnergy,
} from './energy';
import { addLeagueXp, clearLeagueOutcome, ensureLeague } from './league';
import { applyQuestEvent, ensureQuests, questsReward, type QuestEvent } from './quests';
import { allUnitTraits, applyUnitSessionResult, newlyUnlocked, unitTraits } from './mastery';
import { applyAnswer } from './review';
import { gradeIsCorrect, reviewCard, type Grade } from './srs';
import { recordActiveDay, sessionCountsForStreak } from './streak';
import { MIN_SESSION_LENGTH, XP_CORRECT_REVIEW, addXp, isPerfectSession, levelUp, xpForAnswer, xpForSession } from './xp';
import {
  emptyQuestionProgress,
  emptyUnitProgress,
  type Catalog,
  type Exercise,
  type Progress,
  type Quest,
  type SessionMode,
  type Traits,
  type UnitId,
} from './types';

/**
 * Remet l'état au présent : quêtes du jour, semaine de ligue, énergie
 * régénérée. Appelé au début de chaque action et à chaque retour au premier
 * plan. Idempotent.
 */
export function applyTick(progress: Progress, now: Date): Progress {
  const today = toDayKey(now);
  return {
    ...progress,
    quests: ensureQuests(progress.quests, today),
    league: ensureLeague(progress.league, today),
    energy: settleEnergy(progress.energy, now),
    daily: ensureDaily(progress.daily, today),
  };
}

/** Fait avancer les quêtes et verse les récompenses des quêtes accomplies. */
function grantQuests(progress: Progress, event: QuestEvent): { progress: Progress; completed: Quest[] } {
  const { state, completed } = applyQuestEvent(progress.quests, event);
  if (completed.length === 0) return { progress: { ...progress, quests: state }, completed };
  return {
    progress: {
      ...progress,
      quests: state,
      gems: addGems(progress.gems, questsReward(completed)),
      counters: { ...progress.counters, questsCompleted: progress.counters.questsCompleted + completed.length },
    },
    completed,
  };
}

/**
 * Lancement d'une leçon : prélève l'énergie. Null si elle manque — l'écran
 * propose alors d'attendre, de recharger, ou de réviser gratuitement.
 */
export function applyStartLesson(progress: Progress, mode: SessionMode, now: Date): Progress | null {
  const p = applyTick(progress, now);
  if (!modeCostsEnergy(mode)) return p;
  if (!canStartLesson(p.energy, now)) return null;
  return { ...p, energy: spendEnergy(p.energy, LESSON_ENERGY_COST, now) };
}

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
  /** L'erreur a coûté un point d'énergie. */
  energySpent: number;
  questsCompleted: Quest[];
  /** L'objectif du jour vient d'être atteint avec cette réponse. */
  goalReached: boolean;
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
  const ticked = applyTick(progress, action.now);
  const outcome = applyAnswer(
    ticked.questions[action.question.key],
    action.question.key,
    action.correct,
    nowIso,
    action.creditedThisSession,
  );

  // Le boost double les XP de réponse, jamais les bonus de session.
  const xpGained =
    xpForAnswer({ mode: action.mode, correct: action.correct, chrono: action.chrono }) *
    xpMultiplier(ticked.boost, action.now);

  const energySpent = !action.correct && modeCostsEnergy(action.mode) ? MISTAKE_ENERGY_COST : 0;

  let next: Progress = {
    ...ticked,
    xp: addXp(ticked.xp, xpGained),
    questions: { ...ticked.questions, [action.question.key]: outcome.progress },
    counters: {
      ...ticked.counters,
      reviewRecovered: ticked.counters.reviewRecovered + (outcome.leftQueue ? 1 : 0),
    },
    energy: energySpent > 0 ? spendEnergy(ticked.energy, energySpent, action.now) : ticked.energy,
    league: addLeagueXp(ticked.league, xpGained),
  };

  let questsCompleted: Quest[] = [];
  let goalReached = false;
  if (xpGained > 0) {
    const r = grantQuests(next, { kind: 'xp', amount: xpGained });
    next = r.progress;
    questsCompleted = questsCompleted.concat(r.completed);
    const d = creditDailyXp(next, xpGained, toDayKey(action.now));
    next = d.progress;
    goalReached = d.goalReached;
  }
  if (outcome.leftQueue) {
    const r = grantQuests(next, { kind: 'recover', count: 1 });
    next = r.progress;
    questsCompleted = questsCompleted.concat(r.completed);
  }

  return {
    progress: next,
    xpGained,
    enteredQueue: outcome.enteredQueue,
    leftQueue: outcome.leftQueue,
    energySpent,
    questsCompleted,
    goalReached,
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
  /** Meilleur enchaînement de bonnes réponses de la session (quête « combo »). */
  bestCombo?: number;
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
  gemsGained: number;
  energyRefunded: number;
  questsCompleted: Quest[];
  /** L'objectif du jour est tombé avec le bonus de fin de session. */
  goalReached: boolean;
  /** Avancement de l'objectif du jour après la session, 0..1. */
  dailyRatio: number;
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
    bestCombo,
    progressAtSessionStart,
  } = action;
  const today = toDayKey(now);

  // « Avant » = au lancement de la session, pas maintenant : les réponses ont
  // déjà été appliquées une à une.
  const traitsMapBefore = allUnitTraits(progressAtSessionStart, questions, catalog, today);
  const traitsBefore = unitId ? (traitsMapBefore[unitId] ?? 0) : 0;

  const nowIso = now.toISOString();
  const hour = localHour(now);
  const perfect = isPerfectSession(questionCount, correctCount);
  const counted = questionCount >= MIN_SESSION_LENGTH;
  const lesson = modeCostsEnergy(mode);

  // 1. Les XP. Les réponses ont déjà été créditées une à une : on n'ajoute ici
  //    que les bonus de session, jamais doublés par le chrono ni le boost.
  const breakdown = xpForSession({ mode, questionCount, correctCount, chrono });
  const bonusXp = breakdown.completion + breakdown.perfect;
  const xpBefore = progressAtSessionStart.xp;
  const ticked = applyTick(progress, now);
  let next: Progress = { ...ticked, xp: addXp(ticked.xp, bonusXp), league: addLeagueXp(ticked.league, bonusXp) };

  // 1b. Énergie et gemmes de la session.
  const energyRefunded = lesson && perfect ? PERFECT_ENERGY_REFUND : 0;
  if (energyRefunded > 0) next = { ...next, energy: refundEnergy(next.energy, energyRefunded, now) };
  let gemsGained = 0;
  if (counted) {
    if (lesson) gemsGained += GEMS.lesson + (perfect ? GEMS.perfect : 0);
    else if (mode === 'deck') gemsGained += GEMS.deckSession;
  }

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
    const update = recordActiveDay(next.streak, today);
    next = { ...next, streak: update.streak };
    streakIncremented = update.incremented;
    freezeConsumedFor = update.freezeConsumedFor;
    if (update.incremented) gemsGained += streakMilestoneGems(update.streak.current);
  }
  next = { ...next, gems: addGems(next.gems, gemsGained) };

  // 4b. Les quêtes du jour.
  let questsCompleted: Quest[] = [];
  const events: QuestEvent[] = [];
  if (bonusXp > 0) events.push({ kind: 'xp', amount: bonusXp });
  if (lesson && counted) events.push({ kind: 'lesson', perfect });
  if (bestCombo !== undefined && bestCombo > 0) events.push({ kind: 'combo', best: bestCombo });
  for (const event of events) {
    const r = grantQuests(next, event);
    next = r.progress;
    questsCompleted = questsCompleted.concat(r.completed);
  }
  gemsGained += questsReward(questsCompleted);

  // 4c. L'objectif du jour, nourri par le bonus de session.
  const daily = creditDailyXp(next, bonusXp, today);
  next = daily.progress;
  if (daily.goalReached) gemsGained += GEMS.dailyGoal;

  // 5. Les traits, une fois tout le reste écrit.
  const traitsMapAfter = allUnitTraits(next, questions, catalog, today);
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
    gemsGained,
    energyRefunded,
    questsCompleted,
    goalReached: daily.goalReached,
    dailyRatio: dailyRatio(next.daily, today),
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
  const traitsByUnit = allUnitTraits(next, questions, catalog, toDayKey(now));
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
  questsCompleted: Quest[];
  goalReached: boolean;
}

/**
 * Une carte du deck révisée. Persistée immédiatement, comme une réponse.
 * « Encore » ne rapporte rien ; les trois autres réponses valent une bonne
 * réponse de révision (5 XP).
 */
export function applyCardReview(progress: Progress, action: CardReviewAction): CardReviewResult {
  const ticked = applyTick(progress, action.now);
  const correct = gradeIsCorrect(action.grade);
  const xpGained = (correct ? XP_CORRECT_REVIEW : 0) * xpMultiplier(ticked.boost, action.now);
  const card = reviewCard(
    ticked.cards[action.cardId],
    action.cardId,
    action.grade,
    toDayKey(action.now),
    action.now.toISOString(),
  );
  let next: Progress = {
    ...ticked,
    xp: addXp(ticked.xp, xpGained),
    cards: { ...ticked.cards, [action.cardId]: card },
    counters: { ...ticked.counters, cardsReviewed: ticked.counters.cardsReviewed + 1 },
    league: addLeagueXp(ticked.league, xpGained),
  };
  let questsCompleted: Quest[] = [];
  const cards = grantQuests(next, { kind: 'cards', count: 1 });
  next = cards.progress;
  questsCompleted = questsCompleted.concat(cards.completed);
  let goalReached = false;
  if (xpGained > 0) {
    const xp = grantQuests(next, { kind: 'xp', amount: xpGained });
    next = xp.progress;
    questsCompleted = questsCompleted.concat(xp.completed);
    const d = creditDailyXp(next, xpGained, toDayKey(action.now));
    next = d.progress;
    goalReached = d.goalReached;
  }
  return { progress: next, xpGained, correct, questsCompleted, goalReached };
}

/** Changer l'objectif quotidien (onboarding, Profil). */
export function applySetDailyGoal(progress: Progress, goal: number): Progress {
  return { ...progress, daily: { ...progress.daily, goal: Math.max(1, Math.round(goal)) } };
}

/** L'animation de déverrouillage d'une unité a été jouée : une seule fois. */
export function applyUnlockAnimationPlayed(progress: Progress, unitId: UnitId): Progress {
  const unit = progress.units[unitId] ?? emptyUnitProgress(unitId);
  return { ...progress, units: { ...progress.units, [unitId]: { ...unit, unlockAnimationPlayed: true } } };
}

/** Recharge complète de l'énergie contre des gemmes. Null si trop pauvre. */
export function applyBuyRefill(progress: Progress, now: Date): Progress | null {
  const gems = spendGems(progress.gems, SHOP.refill.cost);
  if (gems === null) return null;
  return { ...progress, gems, energy: refillEnergy(now) };
}

/** Le bilan de ligue a été affiché. */
export function applyLeagueOutcomeSeen(progress: Progress): Progress {
  return { ...progress, league: clearLeagueOutcome(progress.league) };
}

/** Fin d'un Blitz : on retient le meilleur score par matière. */
export function applyBlitzResult(
  progress: Progress,
  subjectId: string,
  score: number,
): { progress: Progress; isBest: boolean } {
  const best = progress.blitz[subjectId] ?? 0;
  if (score <= best) return { progress, isBest: false };
  return { progress: { ...progress, blitz: { ...progress.blitz, [subjectId]: score } }, isBest: true };
}

/** Score minimal (sur 10) pour réussir un test de sortie. */
export const SKIP_TEST_MIN_SCORE = 8;

/**
 * Test de sortie réussi sur `unitId` : toutes les unités qui la précèdent
 * dans son chemin et n'ont pas encore de couronne sont validées (2 couronnes :
 * tous leurs exercices vus et réussis une fois). Le chemin s'ouvre jusqu'ici.
 */
export function applySkipTestPassed(
  progress: Progress,
  unitId: UnitId,
  exercises: readonly Exercise[],
  catalog: Catalog,
  now: Date,
): { progress: Progress; validatedUnits: UnitId[] } {
  const target = catalog.units.find((u) => u.id === unitId);
  if (target === undefined) return { progress, validatedUnits: [] };
  const nowIso = now.toISOString();
  const questions = { ...progress.questions };
  const units = { ...progress.units };
  const validatedUnits: UnitId[] = [];

  for (const unit of catalog.units) {
    if (unit.subjectId !== target.subjectId || unit.index >= target.index) continue;
    if (unitTraits(progress, unit.id, exercises) >= 1) continue;
    validatedUnits.push(unit.id);
    units[unit.id] = { ...(units[unit.id] ?? emptyUnitProgress(unit.id)), firstTraitEarned: true };
    for (const e of exercises) {
      if (e.unitId !== unit.id) continue;
      const q = questions[e.key] ?? emptyQuestionProgress(e.key);
      questions[e.key] = {
        ...q,
        seen: Math.max(1, q.seen),
        correct: Math.max(1, q.correct),
        streak: Math.max(1, q.streak),
        lastAnswerCorrect: true,
        lastSeenAt: nowIso,
      };
    }
  }
  return { progress: { ...progress, questions, units }, validatedUnits };
}

/** Une publicité a été affichée : on remet les compteurs d'espacement à zéro. */
export function applyAdShown(progress: Progress, now: Date): Progress {
  return { ...progress, ads: recordAdShown(progress.ads, now.toISOString()) };
}
