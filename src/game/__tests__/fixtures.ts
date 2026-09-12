/**
 * Fixtures. Un catalogue réduit mais réaliste : 5 matières de 3 unités, 4
 * exercices par unité.
 */

import {
  catalogFrom,
  emptyProgress,
  emptyQuestionProgress,
  emptyUnitProgress,
  type Catalog,
  type Exercise,
  type Progress,
  type QcmExercise,
  type Rng,
  type UnitId,
} from '../types';

export const SUBJECTS = ['seo', 'ia', 'py', 'web', 'gr'] as const;
export const STEPS = [1, 2, 3] as const;

/** 15 unités : seo-1, seo-2, seo-3, ia-1… */
export const CATALOG: Catalog = catalogFrom(
  SUBJECTS.flatMap((subject) =>
    STEPS.map((step) => ({ id: `${subject}-${step}`, subjectId: subject })),
  ),
);

export function makeExercise(key: string, unitId: UnitId, answer = 0): QcmExercise {
  return {
    kind: 'qcm',
    key,
    unitId,
    prompt: `Énoncé ${key}`,
    choices: [`${key}-A`, `${key}-B`, `${key}-C`, `${key}-D`],
    answer,
    explain: `Explication ${key}`,
    source: { title: `Source ${key}`, url: `https://example.org/${key}` },
  };
}

/** `n` exercices pour une unité donnée. */
export function makeUnit(unitId: UnitId, n: number): Exercise[] {
  return Array.from({ length: n }, (_, i) =>
    makeExercise(`Q-${unitId.toUpperCase()}-${i + 1}`, unitId),
  );
}

/** Les 15 unités, 4 exercices chacune. */
export function makeFullBank(): Exercise[] {
  return CATALOG.units.flatMap((unit) => makeUnit(unit.id, 4));
}

export function progressWith(overrides: Partial<Progress> = {}): Progress {
  return { ...emptyProgress(), ...overrides };
}

/** Force l'état de progression d'une liste d'exercices. */
export function withQuestionState(
  progress: Progress,
  questions: readonly Exercise[],
  state: { seen?: number; streak?: number; correct?: number; inReview?: boolean },
): Progress {
  const next = { ...progress, questions: { ...progress.questions } };
  for (const q of questions) {
    const base = next.questions[q.key] ?? emptyQuestionProgress(q.key);
    next.questions[q.key] = {
      ...base,
      seen: state.seen ?? Math.max(base.seen, 1),
      correct: state.correct ?? base.correct,
      streak: state.streak ?? base.streak,
      inReview: state.inReview ?? base.inReview,
      lastAnswerCorrect: (state.streak ?? base.streak) > 0,
      lastSeenAt: '2026-09-09T10:00:00.000Z',
    };
  }
  return next;
}

/** Pose le verrou de la première couronne sans passer par une session. */
export function withFirstTrait(progress: Progress, unitId: UnitId): Progress {
  const base = progress.units[unitId] ?? emptyUnitProgress(unitId);
  return {
    ...progress,
    units: { ...progress.units, [unitId]: { ...base, firstTraitEarned: true } },
  };
}

/** RNG déterministe : cycle sur une liste de valeurs de [0, 1). */
export function seededRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

/** RNG « toujours le premier » : shuffle devient l'identité inversée, stable. */
export const rngZero: Rng = () => 0;

/** Mulberry32 : un vrai générateur pseudo-aléatoire, reproductible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
