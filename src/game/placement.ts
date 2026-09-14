/**
 * Le test de niveau : dix questions prises dans les premières unités d'une
 * matière, puis une auto-évaluation sur 10. Le résultat saute des unités
 * (jamais toutes : on ne place personne à la fin, même avec un sans-faute).
 * Pas d'énergie, pas de XP : c'est un réglage, pas une leçon.
 */

import { emptyQuestionProgress, emptyUnitProgress, type Catalog, type Exercise, type Progress, type QcmExercise, type SubjectId, type UnitId } from './types';

export const PLACEMENT_QUESTIONS = 10;
/** Part maximale du chemin qu'un test peut faire sauter. */
export const PLACEMENT_MAX_SHARE = 0.7;
/** En dessous de ce score, le test ne fait rien sauter, quoi qu'on déclare. */
export const PLACEMENT_MIN_RATIO = 0.4;
/** Poids du test face à l'auto-évaluation. */
const TEST_WEIGHT = 0.6;
/** Niveau combiné (0..1) en dessous duquel on ne saute rien. */
const PLACEMENT_FLOOR = 0.3;

/**
 * Les questions du test : des QCM à trois choix ou plus, une unité différente
 * par question autant que possible, réparties sur les premiers 70 % du chemin.
 */
export function pickPlacementQuestions(
  exercises: readonly Exercise[],
  unitIds: readonly UnitId[],
  rng: () => number,
  n: number = PLACEMENT_QUESTIONS,
): QcmExercise[] {
  const eligibleUnits = unitIds.slice(0, Math.max(1, Math.ceil(unitIds.length * PLACEMENT_MAX_SHARE)));
  const byUnit = new Map<UnitId, QcmExercise[]>();
  for (const e of exercises) {
    if (e.kind !== 'qcm' || e.choices.length < 3 || !eligibleUnits.includes(e.unitId)) continue;
    const list = byUnit.get(e.unitId) ?? [];
    list.push(e);
    byUnit.set(e.unitId, list);
  }
  const used = new Set<string>();
  const out: QcmExercise[] = [];
  const take = (pool: QcmExercise[]): boolean => {
    const free = pool.filter((e) => !used.has(e.key));
    if (free.length === 0) return false;
    const pick = free[Math.floor(rng() * free.length)];
    used.add(pick.key);
    out.push(pick);
    return true;
  };
  const all = eligibleUnits.flatMap((id) => byUnit.get(id) ?? []);
  for (let i = 0; i < n; i++) {
    const unit = eligibleUnits[Math.floor((i * eligibleUnits.length) / n)];
    if (!take(byUnit.get(unit) ?? []) && !take(all)) break;
  }
  return out;
}

/**
 * Combien d'unités sauter. `self` est l'auto-évaluation, de 1 à 10.
 * Un score faible ne saute rien ; un score parfait ne dépasse jamais 70 % du
 * chemin, et il reste toujours au moins deux unités à jouer.
 */
export function placementSkip(score: number, total: number, self: number, unitCount: number): number {
  if (total <= 0 || unitCount <= 2) return 0;
  const ratio = score / total;
  if (ratio < PLACEMENT_MIN_RATIO) return 0;
  const selfRatio = Math.min(10, Math.max(1, self)) / 10;
  const combined = TEST_WEIGHT * ratio + (1 - TEST_WEIGHT) * selfRatio;
  // Un niveau combiné de 0,3 ne saute rien ; 1,0 saute la part maximale.
  const effective = Math.max(0, combined - PLACEMENT_FLOOR) / (1 - PLACEMENT_FLOOR);
  const skip = Math.floor(effective * PLACEMENT_MAX_SHARE * unitCount);
  return Math.min(skip, unitCount - 2);
}

/**
 * Valide les `skip` premières unités de la matière à trois couronnes : le
 * chemin s'ouvre, les mondes concernés sont terminés, et tout reste
 * rejouable pour aller chercher la maîtrise. Ne retire jamais rien.
 */
export function applyPlacement(
  progress: Progress,
  subjectId: SubjectId,
  skip: number,
  exercises: readonly Exercise[],
  catalog: Catalog,
  now: Date,
): { progress: Progress; validatedUnits: UnitId[] } {
  const targets = catalog.units
    .filter((u) => u.subjectId === subjectId)
    .sort((a, b) => a.index - b.index)
    .slice(0, Math.max(0, skip));
  if (targets.length === 0) return { progress, validatedUnits: [] };
  const nowIso = now.toISOString();
  const questions = { ...progress.questions };
  const units = { ...progress.units };
  const validatedUnits: UnitId[] = [];
  for (const unit of targets) {
    validatedUnits.push(unit.id);
    const current = units[unit.id] ?? emptyUnitProgress(unit.id);
    units[unit.id] = { ...current, firstTraitEarned: true, unlockedAt: current.unlockedAt ?? nowIso };
    for (const e of exercises) {
      if (e.unitId !== unit.id) continue;
      const q = questions[e.key] ?? emptyQuestionProgress(e.key);
      questions[e.key] = {
        ...q,
        seen: Math.max(1, q.seen),
        correct: Math.max(1, q.correct),
        streak: Math.max(2, q.streak),
        lastAnswerCorrect: true,
        lastSeenAt: nowIso,
      };
    }
  }
  return { progress: { ...progress, questions, units }, validatedUnits };
}
