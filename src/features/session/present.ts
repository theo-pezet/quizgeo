/**
 * Présentation des choix, côté écran : mélange des étapes de cas pratique
 * et repérage des choix qui sont du code (police à chasse fixe).
 */

import { shuffle, type CaseStep, type Rng } from '@/game';

export interface PresentedStep {
  choices: string[];
  /** Index de la bonne réponse APRÈS mélange. */
  answer: number;
  /** Position d'origine de chaque choix affiché. */
  order: number[];
}

/**
 * Mélange les choix d'une étape de cas pratique, comme `presentQcm` : dans
 * le contenu, la bonne réponse est toujours stockée en premier.
 */
export function presentCaseStep(step: CaseStep, rng: Rng): PresentedStep {
  const indices = step.choices.map((_, index) => index);
  const order = step.choices.length <= 2 ? indices : shuffle(indices, rng);
  return { choices: order.map((index) => step.choices[index]), answer: order.indexOf(step.answer), order };
}

/** QCM de code : « lis le code » (`:c:`) et « écris / devine » (`:w:`). */
const CODE_KEY = /:(c|w):/;

/** Signes qui trahissent du code dans un choix hors QCM de code. */
const CODE_LIKE = /=>|[{}[\]`]|\w\(.*\)|<\/?[a-z]+[ >/]|^\s*(def|import|from|const|let|var|SELECT|print)\b|\b[a-z_]+\.[a-z_]+\(|\w=\w|^[.#][\w-]+/i;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
}

/**
 * Faut-il afficher ce choix en police de code ? Dans un QCM de code, tout
 * ce qui n'est pas une phrase (sortie, extrait, valeur) l'est, pour que
 * « Leads: 42 » et « Leads:42 » restent distincts. Ailleurs, seulement ce
 * qui ressemble clairement à du code. Un vrai/faux reste en texte.
 */
export function isCodeChoice(exerciseKey: string, choice: string, choiceCount: number): boolean {
  if (choiceCount <= 2 && wordCount(choice) <= 1 && !/[^\p{L}\s]/u.test(choice)) return false;
  if (choice.includes('\n')) return true;
  const prose = wordCount(choice) >= 4;
  if (CODE_KEY.test(exerciseKey)) return !prose;
  return !prose && CODE_LIKE.test(choice);
}
