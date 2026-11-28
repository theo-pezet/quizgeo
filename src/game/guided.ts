/**
 * La séance guidée : une suite de blocs courts, enchaînés par l'appli, qui
 * remplit l'objectif du jour en minutes.
 *
 * Ordre fixe, du plus exigeant au plus léger pour la tête fraîche :
 * deck (rappel actif), erreurs à revoir, duels de notions confondues, puis
 * des leçons jusqu'à l'objectif. Les trois premiers sont plafonnés par JOUR :
 * au-delà, la fatigue fait cliquer sans lire, ce qui n'apprend rien.
 *
 * La séance ne dépend pas de l'heure : elle commence quand l'apprenant le
 * décide, s'interrompt après n'importe quel bloc et reprend au suivant.
 * La rotation des thèmes compte les leçons FAITES (pas les jours) : un jour
 * court décale les thèmes au lendemain, rien ne se perd.
 */

import { PATH_TRAITS, currentUnit, isUnitUnlocked } from './mastery';
import type { Catalog, DayKey, GuidedState, Progress, Traits, UnitId } from './types';
import { emptyGuided, subjectUnits } from './types';

export const DAILY_DECK_CAP = 10;
/** Cartes nouvelles au plus parmi les cartes du deck du jour. */
export const DAILY_NEW_CARDS = 4;
export const DAILY_REVIEW_CAP = 10;
export const DAILY_DUEL_CAP = 5;
/** Temps de réflexion avant de pouvoir retourner une carte du deck. */
export const DECK_THINK_MS = 3000;
/** Pause entre deux blocs, en secondes. */
export const BREAK_SECONDS = 60;

/** Le compteur du jour, remis à zéro un nouveau jour (la rotation des thèmes, elle, reste). */
export function guidedToday(state: GuidedState | undefined, today: DayKey): GuidedState {
  const s = state ?? emptyGuided();
  if (s.day === today) return s;
  return { ...emptyGuided(), day: today, lessonCounts: s.lessonCounts };
}

export type GuidedCounter = 'deck' | 'review' | 'duels';

/** Ajoute `n` au compteur du jour. */
export function countGuided(progress: Progress, counter: GuidedCounter, n: number, today: DayKey): Progress {
  const s = guidedToday(progress.guided, today);
  return { ...progress, guided: { ...s, [counter]: s[counter] + Math.max(0, n) } };
}

/** Une leçon finie : compte pour le jour, pour la rotation de sa matière, et l'unité est marquée faite aujourd'hui. */
export function countLesson(progress: Progress, subjectId: string, unitId: UnitId, today: DayKey): Progress {
  const s = guidedToday(progress.guided, today);
  const units = s.units ?? [];
  return {
    ...progress,
    guided: {
      ...s,
      lessons: s.lessons + 1,
      units: units.includes(unitId) ? units : [...units, unitId],
      lessonCounts: { ...s.lessonCounts, [subjectId]: (s.lessonCounts[subjectId] ?? 0) + 1 },
    },
  };
}

/**
 * L'unité à proposer dans une matière : celle du chemin (currentUnit), sauf
 * si elle a déjà été faite aujourd'hui. Refaire la même leçon le même jour,
 * c'est répondre de mémoire immédiate : on prend alors l'unité ouverte
 * suivante pas encore acquise, ou rien (la matière attend demain).
 */
export function guidedUnit(subjectId: string, traits: Record<string, Traits>, catalog: Catalog, doneToday: readonly string[]): UnitId | null {
  const current = currentUnit(subjectId, traits, catalog);
  if (current !== null && !doneToday.includes(current)) return current;
  for (const unit of subjectUnits(catalog, subjectId)) {
    if (doneToday.includes(unit.id)) continue;
    if ((traits[unit.id] ?? 0) < PATH_TRAITS && isUnitUnlocked(unit.id, traits, catalog)) return unit.id;
  }
  return null;
}

export interface GuidedLeft {
  deck: number;
  review: number;
  duels: number;
}

/** Ce qu'il reste à faire aujourd'hui sous chaque plafond. */
export function guidedLeft(progress: Progress, today: DayKey): GuidedLeft {
  const s = guidedToday(progress.guided, today);
  return {
    deck: Math.max(0, DAILY_DECK_CAP - s.deck),
    review: Math.max(0, DAILY_REVIEW_CAP - s.review),
    duels: Math.max(0, DAILY_DUEL_CAP - s.duels),
  };
}

/**
 * La matière de la prochaine leçon : celle qui a le plus grand retard sur
 * sa part (poids / total), au vu des leçons déjà faites. Avec 30/25/25/8/4/4/4,
 * les dix premières leçons donnent marketing 3, IA 3, Python 2 ou 3, et les
 * petites matières à leur tour. À égalité, le plus gros poids, puis l'ordre donné.
 * `subjects` : les matières qui ont encore une leçon à proposer.
 */
export function pickLessonSubject(counts: Readonly<Record<string, number>>, subjects: readonly string[], weights: Readonly<Record<string, number>>): string | null {
  if (subjects.length === 0) return null;
  const weight = (id: string) => weights[id] ?? 1;
  const total = subjects.reduce((sum, id) => sum + weight(id), 0);
  const done = subjects.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  let best = subjects[0];
  let bestScore = -Infinity;
  for (const id of subjects) {
    const score = (weight(id) / total) * (done + 1) - (counts[id] ?? 0);
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && weight(id) > weight(best))) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

export type GuidedBlock =
  | { kind: 'deck'; size: number }
  | { kind: 'review'; size: number }
  | { kind: 'duels'; size: number }
  | { kind: 'lesson'; subjectId: string; extra: boolean }
  | { kind: 'done' };

export interface GuidedInput {
  left: GuidedLeft;
  /** Cartes dues ou nouvelles disponibles dans le deck. */
  deckAvailable: number;
  /** Questions dans la file « à revoir ». */
  reviewAvailable: number;
  /** Duels disponibles. */
  duelsAvailable: number;
  /** La matière de la prochaine leçon (pickLessonSubject), ou null si tout est fini. */
  lessonSubject: string | null;
  /** L'objectif en minutes est-il atteint aujourd'hui ? */
  goalMet: boolean;
}

/**
 * Le prochain bloc. Une fois l'objectif atteint, la leçon proposée est un
 * « extra » : l'écran la présente comme facultative.
 */
export function nextGuidedBlock(input: GuidedInput): GuidedBlock {
  const deck = Math.min(input.left.deck, input.deckAvailable);
  if (deck > 0) return { kind: 'deck', size: deck };
  const review = Math.min(input.left.review, input.reviewAvailable);
  if (review > 0) return { kind: 'review', size: review };
  const duels = Math.min(input.left.duels, input.duelsAvailable);
  if (duels > 0) return { kind: 'duels', size: duels };
  if (input.lessonSubject === null) return { kind: 'done' };
  return { kind: 'lesson', subjectId: input.lessonSubject, extra: input.goalMet };
}
