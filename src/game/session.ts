/**
 * Composition d'une session.
 *
 * Le hasard est injecté (`Rng`) : les tests passent un générateur déterministe,
 * l'application passe `Math.random`. Aucune fonction de ce module ne lit
 * l'horloge ni le stockage.
 */

import { compareByLastSeen } from './review';
import { FULL_SESSION_LENGTH } from './xp';
import type { Exercise, QcmExercise, QuestionProgress, Rng, SessionMode } from './types';

export const SESSION_LENGTH = FULL_SESSION_LENGTH;
/** Part d'une leçon réservée aux exercices prioritaires (lecture de code) quand l'unité en a. */
export const PRIORITY_SHARE = 0.7;

/** Fisher-Yates. Ne mute pas l'entrée. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Session d'unité : les 4 ou 5 questions de l'unité, cyclées jusqu'à 10, dans
 * un ordre aléatoire à chaque cycle, sans jamais poser deux fois la même
 * question d'affilée — y compris au raccord entre deux cycles.
 */
export function composeUnitSession(
  questions: readonly Exercise[],
  rng: Rng,
  length: number = SESSION_LENGTH,
): Exercise[] {
  if (questions.length === 0) return [];

  // Les exercices prioritaires (lecture de code) forment 70 % de la leçon quand
  // l'unité en a ; le reste vient du vocabulaire, pour que toutes les questions
  // de l'unité continuent d'être vues (les couronnes en dépendent).
  const priority = questions.filter((q) => q.priority === true);
  const rest = questions.filter((q) => q.priority !== true);
  let pool: readonly Exercise[] = questions;
  if (priority.length > 0 && rest.length > 0) {
    const k = Math.min(priority.length, Math.ceil(length * PRIORITY_SHARE));
    const fill = Math.min(rest.length, Math.max(0, length - k));
    pool = [...shuffle(priority, rng).slice(0, k), ...shuffle(rest, rng).slice(0, fill)];
  }

  const out: Exercise[] = [];
  while (out.length < length) {
    const cycle = shuffle(pool, rng);
    const previous = out[out.length - 1];
    // Raccord : si le cycle recommence par la question qui vient d'être posée,
    // on l'échange avec la suivante. Impossible avec une seule question, auquel
    // cas la répétition est inévitable et acceptée.
    if (previous !== undefined && cycle.length > 1 && cycle[0].key === previous.key) {
      const tmp = cycle[0];
      cycle[0] = cycle[1];
      cycle[1] = tmp;
    }
    for (const question of cycle) {
      if (out.length >= length) break;
      out.push(question);
    }
  }
  return out;
}

/**
 * Session de révision : jusqu'à 10 questions de la file, les plus anciennes
 * d'abord. Si la file en compte moins, la session est PLUS COURTE — on ne
 * complète jamais avec des questions au hasard.
 */
export function composeReviewSession(
  queue: readonly QuestionProgress[],
  byKey: ReadonlyMap<string, Exercise>,
  length: number = SESSION_LENGTH,
): Exercise[] {
  return [...queue]
    .sort(compareByLastSeen)
    .map((entry) => byKey.get(entry.key))
    .filter((q): q is Exercise => q !== undefined)
    .slice(0, length);
}

/**
 * Révision libre : 10 questions au hasard parmi les thèmes et niveaux cochés,
 * sans doublon si le vivier le permet.
 */
export function composeFreeSession(
  pool: readonly Exercise[],
  rng: Rng,
  length: number = SESSION_LENGTH,
): Exercise[] {
  if (pool.length === 0) return [];
  if (pool.length >= length) return shuffle(pool, rng).slice(0, length);

  // Vivier trop petit : on cycle, avec la même règle de non-répétition immédiate.
  return composeUnitSession(pool, rng, length);
}

export interface PresentedQcm {
  exercise: QcmExercise;
  /** Les libellés dans l'ordre affiché. */
  choices: string[];
  /** Index de la bonne réponse APRÈS mélange. */
  answer: number;
  /** Position d'origine de chaque choix affiché, pour le suivi et les tests. */
  order: number[];
}

/**
 * Mélange les choix d'un QCM. Appelé à CHAQUE affichage, y compris entre deux
 * apparitions d'un même exercice dans une session. Un vrai/faux (2 choix)
 * garde son ordre : « Vrai » puis « Faux » est une convention à respecter.
 */
export function presentQcm(exercise: QcmExercise, rng: Rng): PresentedQcm {
  const indices = exercise.choices.map((_, index) => index);
  const order = exercise.choices.length <= 2 ? indices : shuffle(indices, rng);
  return {
    exercise,
    choices: order.map((index) => exercise.choices[index]),
    answer: order.indexOf(exercise.answer),
    order,
  };
}

/** Le mode d'une session détermine les XP par réponse. */
export function xpModeFor(mode: SessionMode): SessionMode {
  return mode;
}

/** Vérifie qu'aucune question n'est posée deux fois d'affilée. */
export function hasNoImmediateRepeat(questions: readonly Exercise[]): boolean {
  for (let i = 1; i < questions.length; i += 1) {
    if (questions[i].key === questions[i - 1].key) return false;
  }
  return true;
}
