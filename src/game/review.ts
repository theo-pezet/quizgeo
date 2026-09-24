/**
 * La réponse et la file de révision
 *
 * Entrée dans la file : toute question dont la dernière réponse est fausse.
 * Sortie : dès que `streak >= 2`. Une question sortie peut rentrer à nouveau.
 */

import {
  emptyQuestionProgress,
  type IsoDate,
  type Progress,
  type QuestionProgress,
} from './types';

/** Cinq couronnes : le streak d'un exercice monte jusqu'à 5. */
export const STREAK_CAP = 5;
export const REVIEW_EXIT_STREAK = 2;

export interface AnswerOutcome {
  progress: QuestionProgress;
  enteredQueue: boolean;
  leftQueue: boolean;
}

/**
 * Applique une réponse à la progression d'une question.
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
): AnswerOutcome {
  const prev = before ?? emptyQuestionProgress(key);
  const wasInQueue = prev.inReview;

  let streak = 0;
  if (correct) streak = creditedThisSession ? prev.streak : Math.min(prev.streak + 1, STREAK_CAP);
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

  return {
    progress,
    enteredQueue: !wasInQueue && inReview,
    leftQueue: wasInQueue && !inReview,
  };
}

/** Les questions actuellement dans la file, plus anciennes d'abord. */
export function reviewQueue(progress: Progress): QuestionProgress[] {
  return Object.values(progress.questions)
    .filter((q) => q.inReview)
    .sort(compareByLastSeen);
}

/**
 * Taille de la file. `known` écarte les questions retirées du contenu depuis
 * (elles restent dans la sauvegarde mais ne peuvent plus être rejouées).
 */
export function reviewQueueSize(progress: Progress, known?: { has(key: string): boolean }): number {
  let size = 0;
  for (const q of Object.values(progress.questions)) if (q.inReview && (!known || known.has(q.key))) size += 1;
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
