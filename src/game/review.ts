/**
 * La réponse et la file de révision
 *
 * Entrée dans la file : toute question dont la dernière réponse est fausse.
 * Sortie : dès que `streak >= 2`. Une question sortie peut rentrer à nouveau.
 *
 * Espacement (1.4) : une question de la file n'est proposée qu'à partir de sa
 * date `reviewDue`. Une erreur la replanifie au lendemain (REVIEW_GAPS[0]),
 * une bonne réponse qui ne suffit pas encore à la faire sortir la repousse de
 * REVIEW_GAPS[1] jours. Les deux bonnes réponses qui font sortir une question
 * sont donc espacées, au lieu de tomber deux jours de suite.
 */

import { addDays, toDayKey } from './dates';
import {
  emptyQuestionProgress,
  type DayKey,
  type IsoDate,
  type Progress,
  type QuestionProgress,
} from './types';

/** Cinq couronnes : le streak d'un exercice monte jusqu'à 5. */
export const STREAK_CAP = 5;
export const REVIEW_EXIT_STREAK = 2;
/**
 * Une bonne réponse donnée en se disant « sûr » vaut deux bonnes réponses :
 * la question sort aussitôt de la file « à revoir » et l'unité avance plus
 * vite. Le bouton « I'm sure » n'est jamais proposé quand la réponse est
 * encore fraîche (question ratée le jour même ou dans la séance, voir
 * `sureAllowed` dans learning.ts) : on ne peut pas s'en servir pour tricher.
 */
export const CONFIDENT_STEP = 2;

/** Écarts, en jours, avant de reproposer une question de la file : après une erreur, puis après une bonne réponse. */
export const REVIEW_GAPS = [1, 3] as const;

export interface AnswerOutcome {
  progress: QuestionProgress;
  enteredQueue: boolean;
  leftQueue: boolean;
}

/**
 * Applique une réponse à la progression d'une question.
 *
 * `confident` : l'apprenant s'est dit « sûr » avant de valider ; une erreur
 * l'est alors aussi (`confidentMiss`), une bonne réponse efface la marque et
 * fait monter le streak de CONFIDENT_STEP au lieu de 1.
 *
 * `creditedThisSession` : la question a déjà reçu une bonne réponse dans la
 * session en cours. Une nouvelle bonne réponse est alors comptée (`correct`,
 * `seen`) mais ne fait pas progresser le streak — voir AnswerAction dans
 * apply.ts. Une mauvaise réponse remet toujours le streak à 0.
 *
 * Fonction pure : elle ne mute pas l'entrée, elle en rend une nouvelle.
 */
export function applyAnswer(
  before: QuestionProgress | undefined,
  key: string,
  correct: boolean,
  now: IsoDate,
  creditedThisSession = false,
  confident = false,
): AnswerOutcome {
  const prev = before ?? emptyQuestionProgress(key);
  const wasInQueue = prev.inReview;

  let streak = 0;
  if (correct) streak = creditedThisSession ? prev.streak : Math.min(prev.streak + (confident ? CONFIDENT_STEP : 1), STREAK_CAP);
  const inReview = correct ? wasInQueue && streak < REVIEW_EXIT_STREAK : true;

  const progress: QuestionProgress = {
    key,
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    streak,
    lastAnswerCorrect: correct,
    lastSeenAt: now,
    inReview,
  };
  // Erreur commise en étant sûr : à revoir en premier (voir learning.ts).
  if (!correct && confident) progress.confidentMiss = true;
  // Date de la dernière erreur : « I'm sure » est masqué le jour même.
  if (!correct) progress.lastMissAt = now;
  else if (prev.lastMissAt !== undefined) progress.lastMissAt = prev.lastMissAt;
  // Prochaine date de passage dans la file (voir REVIEW_GAPS).
  if (inReview) {
    const today = toDayKey(new Date(now));
    if (!correct) progress.reviewDue = addDays(today, REVIEW_GAPS[0]);
    else if (!creditedThisSession) progress.reviewDue = addDays(today, REVIEW_GAPS[1]);
    else if (prev.reviewDue !== undefined) progress.reviewDue = prev.reviewDue;
  }

  return {
    progress,
    enteredQueue: !wasInQueue && inReview,
    leftQueue: wasInQueue && !inReview,
  };
}

/**
 * Une question de la file est-elle à revoir le jour `today` ? Sans `today`, ou
 * sans date (sauvegarde d'avant la 1.4) : oui.
 */
export function isReviewDue(q: QuestionProgress, today?: DayKey): boolean {
  return q.inReview && (today === undefined || q.reviewDue === undefined || q.reviewDue <= today);
}

/**
 * Les questions de la file à revoir le jour `today` (toutes sans `today`) :
 * les erreurs « sûres » d'abord, puis les plus anciennes.
 */
export function reviewQueue(progress: Progress, today?: DayKey): QuestionProgress[] {
  return Object.values(progress.questions)
    .filter((q) => isReviewDue(q, today))
    .sort(compareReview);
}

/** Ordre de la file : erreurs commises en étant sûr en tête, puis par ancienneté. */
export function compareReview(a: QuestionProgress, b: QuestionProgress): number {
  const ca = a.confidentMiss === true;
  const cb = b.confidentMiss === true;
  if (ca !== cb) return ca ? -1 : 1;
  return compareByLastSeen(a, b);
}

/**
 * Taille de la file (à revoir le jour `today`, ou toute la file). `known` écarte les questions retirées du contenu depuis
 * (elles restent dans la sauvegarde mais ne peuvent plus être rejouées).
 */
export function reviewQueueSize(progress: Progress, known?: { has(key: string): boolean }, today?: DayKey): number {
  let size = 0;
  for (const q of Object.values(progress.questions)) if (isReviewDue(q, today) && (!known || known.has(q.key))) size += 1;
  return size;
}

/**
 * Tri par `lastSeenAt` croissant. Une question sans date passe en tête : elle
 * n'a en principe pas pu entrer dans la file, mais un cache corrompu ne doit
 * pas faire planter le tri.
 */
export function compareByLastSeen(a: QuestionProgress, b: QuestionProgress): number {
  if (a.lastSeenAt === b.lastSeenAt) return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  if (a.lastSeenAt === null) return -1;
  if (b.lastSeenAt === null) return 1;
  return a.lastSeenAt < b.lastSeenAt ? -1 : 1;
}
