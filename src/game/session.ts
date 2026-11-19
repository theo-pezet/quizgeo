/**
 * Composition d'une session.
 *
 * Le hasard est injecté (`Rng`) : les tests passent un générateur déterministe,
 * l'application passe `Math.random`. Aucune fonction de ce module ne lit
 * l'horloge ni le stockage.
 */

import { interleaveBy } from './learning';
import { compareReview } from './review';
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
 * Le vivier d'une session : les exercices prioritaires (lecture de code)
 * forment 70 % de la session quand il y en a ; le reste vient du vocabulaire,
 * pour que toutes les questions continuent d'être vues (les couronnes en
 * dépendent). Sans prioritaires, ou sans le reste, le vivier est inchangé.
 */
function mixPriority(questions: readonly Exercise[], rng: Rng, length: number, pick: Picker = shuffle): readonly Exercise[] {
  const priority = questions.filter((q) => q.priority === true);
  const rest = questions.filter((q) => q.priority !== true);
  if (priority.length === 0 || rest.length === 0) return questions;
  const k = Math.min(priority.length, Math.ceil(length * PRIORITY_SHARE));
  const fill = Math.min(rest.length, Math.max(0, length - k));
  return [...pick(priority, rng).slice(0, k), ...pick(rest, rng).slice(0, fill)];
}

type Picker = (items: readonly Exercise[], rng: Rng) => Exercise[];

/** Mélange, puis range du moins su au mieux su (le hasard départage les ex aequo). */
function weakestFirst(strength: (exercise: Exercise) => number): Picker {
  return (items, rng) =>
    shuffle(items, rng)
      .map((exercise, i) => ({ exercise, i, w: strength(exercise) }))
      .sort((a, b) => a.w - b.w || a.i - b.i)
      .map((x) => x.exercise);
}

/** Exercice écrit à la main (clés `:x:`, `:w:`, `:c:`), par opposition aux exercices générés depuis les cartes. */
export const HANDWRITTEN = /:(x|w|c):/;

/**
 * L'ordre de rédaction : les exercices écrits à la main d'abord (ils sont
 * rangés du plus simple au plus dur), puis les exercices générés depuis les
 * cartes, chacun dans l'ordre du contenu.
 */
export function authoredOrder(questions: readonly Exercise[]): Exercise[] {
  return [...questions.filter((q) => HANDWRITTEN.test(q.key)), ...questions.filter((q) => !HANDWRITTEN.test(q.key))];
}

export interface UnitSessionOptions {
  /**
   * Ce que l'apprenant sait d'un exercice : plus c'est bas, plus il passe en
   * premier (jamais vu, raté, puis streak croissant). Quand l'unité compte
   * plus d'exercices qu'une leçon, la leçon prend les moins sus : on ne
   * repose pas ce qu'on vient de réussir en étant sûr tant qu'il reste du
   * neuf ou des erreurs.
   */
  strength?: (exercise: Exercise) => number;
  /**
   * Unité jamais commencée : la première leçon suit l'ordre de rédaction,
   * des bases vers le plus difficile, au lieu d'un tirage au hasard.
   */
  firstTime?: boolean;
}

/**
 * Session d'unité : jusqu'à 10 exercices de l'unité ; une petite unité est
 * cyclée jusqu'à 10, dans un ordre aléatoire à chaque cycle, sans jamais poser
 * deux fois la même question d'affilée, y compris au raccord entre deux cycles.
 */
export function composeUnitSession(
  questions: readonly Exercise[],
  rng: Rng,
  length: number = SESSION_LENGTH,
  options: UnitSessionOptions = {},
): Exercise[] {
  if (questions.length === 0) return [];
  const out: Exercise[] = [];
  let pool: readonly Exercise[];
  if (options.firstTime) {
    // Première leçon : l'ordre de rédaction, puis on cycle si l'unité est petite.
    const ordered = authoredOrder(questions);
    if (ordered.length >= length) return ordered.slice(0, length);
    out.push(...ordered);
    pool = ordered;
  } else if (options.strength) {
    const pick = weakestFirst(options.strength);
    pool = mixPriority(questions, rng, length, pick);
    if (pool.length > length) pool = pick(pool, rng).slice(0, length);
  } else {
    pool = mixPriority(questions, rng, length);
  }

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
 * Session de révision : jusqu'à 10 questions de la file, les erreurs « sûres »
 * puis les plus anciennes d'abord. Si la file en compte moins, la session est
 * PLUS COURTE — on ne complète jamais avec des questions au hasard.
 * `groupOf` (la matière d'un exercice) : les questions retenues sont
 * entrelacées par matière (voir learning.ts).
 */
export function composeReviewSession(
  queue: readonly QuestionProgress[],
  byKey: ReadonlyMap<string, Exercise>,
  length: number = SESSION_LENGTH,
  groupOf?: (exercise: Exercise) => string,
): Exercise[] {
  const picked = [...queue]
    .sort(compareReview)
    .map((entry) => byKey.get(entry.key))
    .filter((q): q is Exercise => q !== undefined)
    .slice(0, length);
  return groupOf ? interleaveBy(picked, groupOf) : picked;
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
  if (pool.length >= length) return shuffle(mixPriority(pool, rng, length), rng).slice(0, length);

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
