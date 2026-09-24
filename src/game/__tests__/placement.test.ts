import { catalogFrom, emptyProgress, type Exercise, type QcmExercise } from '../types';
import { unitTraits } from '../mastery';
import { PLACEMENT_MIN_QUESTIONS, PLACEMENT_QUESTIONS, applyPlacement, pickPlacementQuestions, placementSkip } from '../placement';

const qcm = (unitId: string, n: number, choices = 4): QcmExercise => ({
  kind: 'qcm',
  key: `${unitId}:q${n}`,
  unitId,
  prompt: `Q${n}`,
  choices: Array.from({ length: choices }, (_, i) => `c${i}`),
  answer: 0,
});

const UNITS = Array.from({ length: 10 }, (_, i) => `u${i}`);
const EXERCISES: Exercise[] = UNITS.flatMap((u) => [qcm(u, 1), qcm(u, 2), qcm(u, 3, 2), { kind: 'cloze', key: `${u}:cl`, unitId: u, text: 'a ___', answer: 'b', bank: [] }]);
const rng = () => 0.42;

describe('pickPlacementQuestions', () => {
  it('prend dix QCM à trois choix ou plus, dans les 70 % premières unités, une unité par question', () => {
    const picked = pickPlacementQuestions(EXERCISES, UNITS, rng);
    expect(picked).toHaveLength(PLACEMENT_QUESTIONS);
    for (const e of picked) {
      expect(e.kind).toBe('qcm');
      expect(e.choices.length).toBeGreaterThanOrEqual(3);
      expect(UNITS.indexOf(e.unitId)).toBeLessThan(7);
    }
    expect(new Set(picked.map((e) => e.key)).size).toBe(PLACEMENT_QUESTIONS);
  });

  it('complète avec d’autres unités quand une unité n’a plus de QCM, et s’arrête quand il n’y a plus rien', () => {
    const few: Exercise[] = [qcm('u0', 1), qcm('u0', 2), qcm('u1', 1)];
    expect(pickPlacementQuestions(few, ['u0', 'u1', 'u2'], rng).map((e) => e.key).sort()).toEqual(['u0:q1', 'u0:q2', 'u1:q1']);
    expect(pickPlacementQuestions([], ['u0'], rng)).toEqual([]);
  });

  it('respecte le nombre demandé', () => {
    expect(pickPlacementQuestions(EXERCISES, UNITS, rng, 3)).toHaveLength(3);
  });
});

describe('placementSkip', () => {
  it('ne saute rien sur un score faible, même avec une auto-évaluation haute', () => {
    expect(placementSkip(3, 10, 10, 30)).toBe(0);
    // 4 ou 5 sur 10 est à portée du hasard sur des QCM à 3 ou 4 choix.
    expect(placementSkip(4, 10, 10, 30)).toBe(0);
    expect(placementSkip(5, 10, 10, 30)).toBe(0);
  });

  it('ne saute rien quand le test compte trop peu de questions', () => {
    expect(PLACEMENT_MIN_QUESTIONS).toBe(5);
    expect(placementSkip(3, 3, 10, 30)).toBe(0);
    expect(placementSkip(4, 4, 10, 30)).toBe(0);
    expect(placementSkip(5, 5, 10, 30)).toBe(21);
  });

  it('ne saute rien sans questions ni sur un chemin trop court', () => {
    expect(placementSkip(5, 0, 5, 30)).toBe(0);
    expect(placementSkip(10, 10, 10, 2)).toBe(0);
  });

  it('combine test et auto-évaluation, sans dépasser 70 % du chemin ni laisser moins de deux unités', () => {
    // 0.6 * 1 + 0.4 * 1 = 1 → 0.7 * 30 = 21
    expect(placementSkip(10, 10, 10, 30)).toBe(21);
    // 0.6 * 0.6 + 0.4 * 0.5 = 0.56 → (0.56 - 0.3) / 0.7 = 0.3714 → × 0.7 × 30 = 7
    expect(placementSkip(6, 10, 5, 30)).toBe(7);
    // 6/10 en se disant 7/10 : 0.64 → 0.4857 → 10, pas 21.
    expect(placementSkip(6, 10, 7, 31)).toBe(10);
    // Chemin de 3 unités : au plus 1.
    expect(placementSkip(10, 10, 10, 3)).toBe(1);
    // Auto-évaluation hors bornes : ramenée dans 1..10.
    expect(placementSkip(10, 10, 99, 30)).toBe(21);
    expect(placementSkip(10, 10, -5, 30)).toBe(placementSkip(10, 10, 1, 30));
  });
});

describe('applyPlacement', () => {
  const catalog = catalogFrom([...UNITS.map((id) => ({ id, subjectId: 's' })), { id: 'other', subjectId: 'o' }]);
  const now = new Date('2026-09-14T10:00:00Z');

  it('valide les premières unités à trois couronnes et laisse les autres intactes', () => {
    const { progress, validatedUnits } = applyPlacement(emptyProgress(), 's', 3, EXERCISES, catalog, now);
    expect(validatedUnits).toEqual(['u0', 'u1', 'u2']);
    expect(unitTraits(progress, 'u0', EXERCISES)).toBe(3);
    expect(unitTraits(progress, 'u3', EXERCISES)).toBe(0);
    expect(progress.units.u0.unlockedAt).toBe(now.toISOString());
  });

  it('ne retire jamais rien et garde la date d’ouverture existante', () => {
    const first = applyPlacement(emptyProgress(), 's', 2, EXERCISES, catalog, now).progress;
    const boosted = { ...first, questions: { ...first.questions, 'u0:q1': { ...first.questions['u0:q1'], streak: 4, correct: 9, seen: 9 } } };
    const again = applyPlacement(boosted, 's', 1, EXERCISES, catalog, new Date('2026-10-01T10:00:00Z')).progress;
    expect(again.questions['u0:q1'].streak).toBe(4);
    expect(again.questions['u0:q1'].correct).toBe(9);
    expect(again.units.u0.unlockedAt).toBe(now.toISOString());
  });

  it('ne fait rien pour zéro unité ou une matière inconnue', () => {
    const p = emptyProgress();
    expect(applyPlacement(p, 's', 0, EXERCISES, catalog, now)).toEqual({ progress: p, validatedUnits: [] });
    expect(applyPlacement(p, 'nope', 5, EXERCISES, catalog, now)).toEqual({ progress: p, validatedUnits: [] });
  });
});
