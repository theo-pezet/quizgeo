/**
 * La maîtrise (les couronnes d'une unité) et le déverrouillage du chemin.
 *
 * Les couronnes 2 et 3 se calculent à chaque réponse et peuvent redescendre.
 * La couronne 1 est LATCHÉE : sa condition parle du score de la dernière
 * session, et une unité ouverte ne doit jamais se refermer. Recalculer la
 * condition à chaque réponse reverrouillerait des unités déjà ouvertes.
 */

import { daysBetween, toDayKey } from './dates';
import { FULL_SESSION_LENGTH } from './xp';
import {
  emptyUnitProgress,
  previousUnit,
  subjectIds,
  subjectUnits,
  type Catalog,
  type DayKey,
  type Exercise,
  type Progress,
  type QuestionProgress,
  type SubjectId,
  type Traits,
  type UnitId,
  type UnitProgress,
} from './types';

/** Score minimal d'une session pour acquérir la première couronne. */
export const FIRST_TRAIT_MIN_SCORE = 6;

/** Couronnes nécessaires pour que le chemin avance. Au-delà : maîtrise. */
export const PATH_TRAITS = 3;
export const MAX_TRAITS: Traits = 5;

/** Sans révision, un exercice perd un cran de streak tous les 14 jours. */
export const DECAY_DAYS = 14;

/**
 * Streak en dessous duquel l'usure ne descend jamais : 2, soit 3 couronnes
 * (PATH_TRAITS). Seule la maîtrise (4 et 5 couronnes) se fissure ; le chemin
 * acquis ne recule pas, « Continuer » ne revient pas en arrière et aucune
 * unité ne se referme.
 */
export const DECAY_FLOOR_STREAK = PATH_TRAITS - 1;

/**
 * Streak effectif d'un exercice à la date `today` : le streak enregistré,
 * moins un cran par période de 14 jours sans le revoir, sans jamais passer
 * sous min(streak, 2). Rien n'est écrit ; revenir sur l'unité restaure les
 * couronnes de maîtrise en re-répondant juste.
 */
export function effectiveStreak(q: QuestionProgress, today: DayKey | undefined): number {
  if (today === undefined || q.lastSeenAt === null) return q.streak;
  const elapsed = daysBetween(toDayKey(new Date(q.lastSeenAt)), today);
  const lost = Math.floor(Math.max(0, elapsed) / DECAY_DAYS);
  const floor = Math.min(q.streak, DECAY_FLOOR_STREAK);
  return Math.max(floor, q.streak - lost);
}

export function unitExercises(exercises: readonly Exercise[], unitId: UnitId): Exercise[] {
  return exercises.filter((e) => e.unitId === unitId);
}

function progressOf(progress: Progress, key: string): QuestionProgress | undefined {
  return progress.questions[key];
}

/**
 * Couronnes d'une unité.
 *
 * Une unité sans exercice rend 0 : « tous les exercices vérifient X » est
 * vrai du vide, mais afficher 3 couronnes sur une unité vide serait un mensonge.
 */
export function unitTraits(
  progress: Progress,
  unitId: UnitId,
  exercises: readonly Exercise[],
  today?: DayKey,
): Traits {
  const keys = unitExercises(exercises, unitId).map((e) => e.key);
  if (keys.length === 0) return 0;

  const entries = keys.map((key) => progressOf(progress, key));
  const allSeen = entries.every((q) => q !== undefined && q.seen >= 1);
  // Le streak le plus bas de l'unité fixe les couronnes 2 à 5.
  let minStreak = Infinity;
  for (const q of entries) minStreak = Math.min(minStreak, q === undefined ? 0 : effectiveStreak(q, today));

  const latched = progress.units[unitId]?.firstTraitEarned === true;

  let traits: Traits = 0;
  if (minStreak >= 4) traits = 5;
  else if (minStreak >= 3) traits = 4;
  else if (minStreak >= 2) traits = 3;
  else if (minStreak >= 1) traits = 2;
  else if (allSeen && latched) traits = 1;

  // Jamais en dessous de 1 une fois obtenue.
  if (latched && traits < 1) traits = 1;
  return traits;
}

/**
 * Couronnes de toutes les unités : celles du catalogue ET celles qui n'ont
 * que des exercices (contenu en avance sur le catalogue, ou l'inverse).
 */
export function allUnitTraits(
  progress: Progress,
  exercises: readonly Exercise[],
  catalog: Catalog,
  today?: DayKey,
): Record<string, Traits> {
  const units = new Set<UnitId>();
  for (const unit of catalog.units) units.add(unit.id);
  for (const e of exercises) units.add(e.unitId);
  const out: Record<string, Traits> = {};
  for (const unitId of units) out[unitId] = unitTraits(progress, unitId, exercises, today);
  return out;
}

/**
 * Met à jour l'unité en fin de session : compteurs, meilleur score, `perfect`,
 * et acquisition éventuelle de la première couronne.
 *
 * Le verrou se pose aussi lorsque l'unité atteint 2 ou 3 couronnes sans être
 * passée par une session à ≥ 6/10 : avoir tous ses exercices à streak ≥ 1
 * est une preuve de maîtrise plus forte que le score d'une session.
 */
export function applyUnitSessionResult(
  unit: UnitProgress | undefined,
  unitId: UnitId,
  params: {
    score: number;
    questionCount: number;
    allQuestionsSeen: boolean;
    computedTraitsAtLeast2: boolean;
  },
): UnitProgress {
  const prev = unit ?? emptyUnitProgress(unitId);
  const earnsFirstTrait =
    prev.firstTraitEarned ||
    params.computedTraitsAtLeast2 ||
    (params.allQuestionsSeen && params.score >= FIRST_TRAIT_MIN_SCORE);

  return {
    ...prev,
    sessionsPlayed: prev.sessionsPlayed + 1,
    bestScore: Math.max(prev.bestScore, params.score),
    perfect:
      prev.perfect ||
      (params.questionCount === FULL_SESSION_LENGTH && params.score === FULL_SESSION_LENGTH),
    firstTraitEarned: earnsFirstTrait,
  };
}

/**
 * Une unité est-elle ouverte ?
 *
 * La première unité de chaque matière l'est d'emblée. Chaque unité suivante
 * s'ouvre quand celle qui la précède dans SON chemin a ≥ 1 couronne. Les
 * matières sont indépendantes : autant de portes d'entrée que de matières.
 * Une unité absente du catalogue reste fermée.
 */
export function isUnitUnlocked(
  unitId: UnitId,
  traitsByUnit: Record<string, Traits>,
  catalog: Catalog,
): boolean {
  const unit = catalog.units.find((u) => u.id === unitId);
  if (unit === undefined) return false;
  if (unit.index === 0) return true;
  const previous = previousUnit(catalog, unitId);
  return previous !== null && (traitsByUnit[previous.id] ?? 0) >= 1;
}

export function unlockedUnits(
  traitsByUnit: Record<string, Traits>,
  catalog: Catalog,
): UnitId[] {
  return catalog.units
    .filter((unit) => isUnitUnlocked(unit.id, traitsByUnit, catalog))
    .map((unit) => unit.id)
    .sort();
}

/**
 * Unités nouvellement ouvertes entre deux états — ce qui déclenche
 * l'animation de nœud, une seule fois, à la prochaine apparition du chemin.
 */
export function newlyUnlocked(
  before: Record<string, Traits>,
  after: Record<string, Traits>,
  catalog: Catalog,
): UnitId[] {
  const wasOpen = new Set(unlockedUnits(before, catalog));
  return unlockedUnits(after, catalog).filter((unitId) => !wasOpen.has(unitId));
}

/** Une matière dont toutes les unités sont à 5 couronnes (badge « Chapitre clos »). */
export function isSubjectComplete(
  subjectId: SubjectId,
  traitsByUnit: Record<string, Traits>,
  catalog: Catalog,
): boolean {
  const units = subjectUnits(catalog, subjectId);
  return units.length > 0 && units.every((unit) => traitsByUnit[unit.id] === MAX_TRAITS);
}

export function allSubjectsComplete(
  traitsByUnit: Record<string, Traits>,
  catalog: Catalog,
): boolean {
  const ids = subjectIds(catalog);
  return ids.length > 0 && ids.every((id) => isSubjectComplete(id, traitsByUnit, catalog));
}

/**
 * Où en est l'utilisateur sur un chemin : la première unité qui n'est pas
 * encore à 3 couronnes (PATH_TRAITS), ou la dernière unité si tout est fini.
 * Elle est forcément ouverte : on ne l'atteint qu'en passant par une unité à
 * 3 couronnes, qui ouvre la suivante. C'est le nœud « Continuer » de l'accueil.
 */
export function currentUnit(
  subjectId: SubjectId,
  traitsByUnit: Record<string, Traits>,
  catalog: Catalog,
): UnitId | null {
  const units = subjectUnits(catalog, subjectId);
  if (units.length === 0) return null;
  for (const unit of units) {
    if ((traitsByUnit[unit.id] ?? 0) < PATH_TRAITS) return unit.id;
  }
  return units[units.length - 1].id;
}
