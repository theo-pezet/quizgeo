/**
 * Point d'entrée du contenu. Le reste de l'app n'importe que d'ici.
 */

import { catalogFrom, type Catalog, type Exercise } from '@/game';

import { CARDS, cardsOf } from './deck';
import { EXTRA_EXERCISES } from './extras';
import { generateExercises, resolveUnitCards } from './generate';
import { UNITS } from './units';

export { CARDS, CARD_BY_ID, CARD_IDS, cardIdsOf, cardsOf } from './deck';
export { SUBJECTS, SUBJECT_BY_ID } from './subjects';
export { UNITS, UNIT_BY_ID } from './units';
export type { Card, Subject, Unit } from './types';

export const CATALOG: Catalog = catalogFrom(UNITS.map((u) => ({ id: u.id, subjectId: u.subjectId })));

function buildExercises(): Exercise[] {
  const out: Exercise[] = [];
  const bySubject = new Map<string, ReturnType<typeof cardsOf>>();
  for (const unit of UNITS) {
    let subjectCards = bySubject.get(unit.subjectId);
    if (subjectCards === undefined) {
      subjectCards = cardsOf(unit.subjectId);
      bySubject.set(unit.subjectId, subjectCards);
    }
    out.push(...generateExercises(unit, resolveUnitCards(unit, CARDS), subjectCards));
  }
  out.push(...EXTRA_EXERCISES);
  return out;
}

export const EXERCISES: readonly Exercise[] = buildExercises();
export const EXERCISE_BY_KEY: ReadonlyMap<string, Exercise> = new Map(EXERCISES.map((e) => [e.key, e]));

export function exercisesOfUnit(unitId: string): Exercise[] {
  return EXERCISES.filter((e) => e.unitId === unitId);
}

export function exercisesOfSubject(subjectId: string): Exercise[] {
  const unitIds = new Set(UNITS.filter((u) => u.subjectId === subjectId).map((u) => u.id));
  return EXERCISES.filter((e) => unitIds.has(e.unitId));
}
