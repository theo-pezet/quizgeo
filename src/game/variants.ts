/**
 * Les formes d'une question. Une question revue souvent finit par être
 * reconnue à son énoncé : on clique la réponse retenue sans réfléchir. Aux
 * passages suivants, la question change donc de forme, à tour de rôle :
 *
 * - l'originale ;
 * - ses variantes rédigées (énoncé, choix et bonne réponse reformulés, autre
 *   cas ou autre exemple), quand il y en a ;
 * - « vérifie cette réponse » : l'énoncé avec UNE réponse proposée, la bonne
 *   ou un piège tiré au sort, à juger juste ou fausse. Il faut alors connaître
 *   la réponse, pas la reconnaître parmi d'autres. Réservée aux QCM d'au moins
 *   trois choix (un vrai/faux le serait déjà).
 *
 * Le premier passage montre toujours l'originale. La clé de la question ne
 * change pas : la progression reste celle de la même notion.
 */

import type { Exercise, QcmExercise, QuestionProgress, Rng } from './types';

export interface VariantTexts {
  right: string;
  wrong: string;
  /** L'énoncé suivi de la réponse proposée. */
  proposed: (prompt: string, answer: string) => string;
  /** En tête de l'explication quand la réponse proposée était un piège. */
  correctIs: (answer: string) => string;
}

/** Nombre de formes d'un QCM : l'originale, ses variantes, et « vérifie » s'il y a assez de choix. */
export function formCount(exercise: QcmExercise): number {
  return 1 + (exercise.variants?.length ?? 0) + (exercise.choices.length >= 3 ? 1 : 0);
}

function checkForm(exercise: QcmExercise, rng: Rng, texts: VariantTexts): QcmExercise {
  const wrongs = exercise.choices.map((_, i) => i).filter((i) => i !== exercise.answer);
  const honest = rng() < 0.5;
  const shown = honest ? exercise.answer : wrongs[Math.min(wrongs.length - 1, Math.floor(rng() * wrongs.length))];
  const correctText = exercise.choices[exercise.answer];
  const cards = exercise.choiceCards;
  const { variants: _v, whyWrong: _w, choiceCards: _c, ...base } = exercise;
  return {
    ...base,
    prompt: texts.proposed(exercise.prompt, exercise.choices[shown]),
    choices: [texts.right, texts.wrong],
    answer: honest ? 0 : 1,
    explain: honest ? exercise.explain : `${texts.correctIs(correctText)} ${exercise.explain ?? ''}`.trim(),
    // Juger « juste » un piège, c'est confondre le piège avec la bonne notion.
    ...(cards ? { choiceCards: [cards[shown], cards[exercise.answer]] } : {}),
  };
}

/**
 * La forme à poser maintenant, selon le nombre de passages déjà faits :
 * passage n → forme n modulo le nombre de formes. Les autres exercices
 * (association, ordre, cas…) passent tels quels.
 */
export function presentVariant(exercise: Exercise, question: QuestionProgress | undefined, rng: Rng, texts: VariantTexts): Exercise {
  if (exercise.kind !== 'qcm' || !question || question.seen === 0) return exercise;
  const index = question.seen % formCount(exercise);
  const variants = exercise.variants ?? [];
  if (index === 0) return exercise;
  if (index <= variants.length) {
    const v = variants[index - 1];
    const { variants: _v, whyWrong: _w, choiceCards: _c, ...base } = exercise;
    return {
      ...base,
      prompt: v.prompt,
      choices: [...v.choices],
      answer: v.answer,
      explain: v.explain ?? exercise.explain,
      ...(v.choiceCards ? { choiceCards: [...v.choiceCards] } : {}),
    };
  }
  return checkForm(exercise, rng, texts);
}
