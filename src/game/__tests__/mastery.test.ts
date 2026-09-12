import {
  FIRST_TRAIT_MIN_SCORE,
  effectiveStreak,
  allUnitTraits,
  applyUnitSessionResult,
  isSubjectComplete,
  currentUnit,
  isUnitUnlocked,
  newlyUnlocked,
  unitExercises,
  unitTraits,
  unlockedUnits,
} from '../mastery';
import { emptyQuestionProgress, emptyUnitProgress, type Traits, type UnitId } from '../types';
import {
  CATALOG,
  makeFullBank,
  makeUnit,
  progressWith,
  withFirstTrait,
  withQuestionState,
} from './fixtures';

const UNIT: UnitId = 'seo-2';
const questions = makeUnit('seo-2', 4);
const otherUnit = makeUnit('seo-1', 4);
const bank = [...questions, ...otherUnit];

describe('unitExercises', () => {
  it('ne retient que les exercices de l’unité', () => {
    expect(unitExercises(bank, UNIT).map((q) => q.key)).toEqual(questions.map((q) => q.key));
  });
});

describe('unitTraits', () => {
  it('rend 0 sur une unité sans question', () => {
    expect(unitTraits(progressWith(), 'ia-3', bank)).toBe(0);
  });

  it('rend 0 à l’état initial', () => {
    expect(unitTraits(progressWith(), UNIT, bank)).toBe(0);
  });

  it('rend 0 si toutes les questions sont vues mais le trait non acquis', () => {
    const p = withQuestionState(progressWith(), questions, { seen: 1, streak: 0 });
    expect(unitTraits(p, UNIT, bank)).toBe(0);
  });

  it('rend 1 quand toutes les questions sont vues et le trait latché', () => {
    const p = withFirstTrait(
      withQuestionState(progressWith(), questions, { seen: 1, streak: 0 }),
      UNIT,
    );
    expect(unitTraits(p, UNIT, bank)).toBe(1);
  });

  it('rend 1 même si une question n’a jamais été vue, une fois le trait acquis', () => {
    const p = withFirstTrait(progressWith(), UNIT);
    expect(unitTraits(p, UNIT, bank)).toBe(1);
  });

  it('rend 2 quand toutes les questions ont streak ≥ 1', () => {
    const p = withQuestionState(progressWith(), questions, { seen: 2, streak: 1 });
    expect(unitTraits(p, UNIT, bank)).toBe(2);
  });

  it('rend 3 quand toutes les questions ont streak ≥ 2', () => {
    const p = withQuestionState(progressWith(), questions, { seen: 3, streak: 2 });
    expect(unitTraits(p, UNIT, bank)).toBe(3);
  });

  it('rend 4 puis 5 quand le streak minimal atteint 3 puis 4', () => {
    const p4 = withQuestionState(progressWith(), questions, { seen: 4, streak: 3 });
    expect(unitTraits(p4, UNIT, bank)).toBe(4);
    const p5 = withQuestionState(progressWith(), questions, { seen: 5, streak: 4 });
    expect(unitTraits(p5, UNIT, bank)).toBe(5);
    // Le streak le plus BAS décide.
    expect(unitTraits(withQuestionState(p5, [questions[0]], { streak: 3 }), UNIT, bank)).toBe(4);
  });

  describe('fissures (decay)', () => {
    // Les fixtures datent lastSeenAt du 2026-09-09.
    it('ne change rien sans date de référence ni avant 14 jours', () => {
      const p = withQuestionState(progressWith(), questions, { seen: 5, streak: 4 });
      expect(unitTraits(p, UNIT, bank)).toBe(5);
      expect(unitTraits(p, UNIT, bank, '2026-09-22')).toBe(5);
    });

    it('retire une couronne par période de 14 jours sans révision', () => {
      const p = withQuestionState(progressWith(), questions, { seen: 5, streak: 4 });
      expect(unitTraits(p, UNIT, bank, '2026-09-23')).toBe(4);
      expect(unitTraits(p, UNIT, bank, '2026-10-07')).toBe(3);
      expect(unitTraits(p, UNIT, bank, '2026-10-21')).toBe(2);
      expect(unitTraits(p, UNIT, bank, '2027-01-01')).toBe(0);
    });

    it('ne descend jamais sous la première couronne latchée', () => {
      let p = withQuestionState(progressWith(), questions, { seen: 5, streak: 4 });
      p = withFirstTrait(p, UNIT);
      expect(unitTraits(p, UNIT, bank, '2030-01-01')).toBe(1);
    });

    it('effectiveStreak ignore une question jamais vue ou une date dans le passé', () => {
      expect(effectiveStreak({ ...emptyQuestionProgress('k'), streak: 2 }, '2026-09-09')).toBe(2);
      const seen = { ...emptyQuestionProgress('k'), streak: 2, lastSeenAt: '2026-09-09T10:00:00.000Z' };
      expect(effectiveStreak(seen, '2026-09-01')).toBe(2);
      expect(effectiveStreak(seen, undefined)).toBe(2);
    });
  });

  it('ne compte pas une question inconnue de la progression', () => {
    let p = withQuestionState(progressWith(), questions.slice(0, 3), { seen: 3, streak: 3 });
    p = withFirstTrait(p, UNIT);
    expect(unitTraits(p, UNIT, bank)).toBe(1);
  });

  describe('régression', () => {
    it('redescend de 3 à 2 quand une question retombe à streak 1', () => {
      let p = withQuestionState(progressWith(), questions, { seen: 3, streak: 2 });
      p = withFirstTrait(p, UNIT);
      expect(unitTraits(p, UNIT, bank)).toBe(3);
      p = withQuestionState(p, [questions[0]], { streak: 1 });
      expect(unitTraits(p, UNIT, bank)).toBe(2);
    });

    it('redescend de 2 à 1 quand une question retombe à streak 0', () => {
      let p = withQuestionState(progressWith(), questions, { seen: 3, streak: 1 });
      p = withFirstTrait(p, UNIT);
      p = withQuestionState(p, [questions[0]], { streak: 0 });
      expect(unitTraits(p, UNIT, bank)).toBe(1);
    });

    it('ne redescend JAMAIS sous 1 une fois le trait acquis', () => {
      let p = withQuestionState(progressWith(), questions, { seen: 5, streak: 3 });
      p = withFirstTrait(p, UNIT);
      p = withQuestionState(p, questions, { streak: 0 });
      expect(unitTraits(p, UNIT, bank)).toBe(1);
    });
  });
});

describe('allUnitTraits', () => {
  it('couvre les 15 unités de la banque complète', () => {
    const traits = allUnitTraits(progressWith(), makeFullBank(), CATALOG);
    expect(Object.keys(traits)).toHaveLength(15);
    expect(Object.values(traits).every((t) => t === 0)).toBe(true);
  });

  it('applique la date de référence à toutes les unités', () => {
    const p = withQuestionState(progressWith(), questions, { seen: 5, streak: 4 });
    expect(allUnitTraits(p, bank, CATALOG, '2026-10-07')[UNIT]).toBe(3);
  });
});

describe('applyUnitSessionResult', () => {
  it('acquiert le premier trait à 6/10 avec toutes les questions vues', () => {
    const r = applyUnitSessionResult(undefined, UNIT, {
      score: FIRST_TRAIT_MIN_SCORE,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: false,
    });
    expect(r.firstTraitEarned).toBe(true);
    expect(r.sessionsPlayed).toBe(1);
    expect(r.bestScore).toBe(6);
  });

  it('ne l’acquiert pas à 5/10', () => {
    const r = applyUnitSessionResult(undefined, UNIT, {
      score: 5,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: false,
    });
    expect(r.firstTraitEarned).toBe(false);
  });

  it('ne l’acquiert pas si une question n’a pas été vue', () => {
    const r = applyUnitSessionResult(undefined, UNIT, {
      score: 10,
      questionCount: 10,
      allQuestionsSeen: false,
      computedTraitsAtLeast2: false,
    });
    expect(r.firstTraitEarned).toBe(false);
  });

  it('l’acquiert quand l’unité atteint 2 traits par une autre voie', () => {
    const r = applyUnitSessionResult(undefined, UNIT, {
      score: 3,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: true,
    });
    expect(r.firstTraitEarned).toBe(true);
  });

  it('ne perd jamais un verrou déjà posé', () => {
    const before = { ...emptyUnitProgress(UNIT), firstTraitEarned: true };
    const r = applyUnitSessionResult(before, UNIT, {
      score: 0,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: false,
    });
    expect(r.firstTraitEarned).toBe(true);
  });

  it('rend `perfect` irréversible', () => {
    const perfect = applyUnitSessionResult(undefined, UNIT, {
      score: 10,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: true,
    });
    expect(perfect.perfect).toBe(true);

    const after = applyUnitSessionResult(perfect, UNIT, {
      score: 2,
      questionCount: 10,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: false,
    });
    expect(after.perfect).toBe(true);
    expect(after.bestScore).toBe(10);
    expect(after.sessionsPlayed).toBe(2);
  });

  it('ne marque pas `perfect` pour un sans-faute sur moins de 10 questions', () => {
    const r = applyUnitSessionResult(undefined, UNIT, {
      score: 7,
      questionCount: 7,
      allQuestionsSeen: true,
      computedTraitsAtLeast2: false,
    });
    expect(r.perfect).toBe(false);
  });
});

describe('déverrouillage', () => {
  const traits = (entries: Record<string, Traits>): Record<string, Traits> => {
    const base: Record<string, Traits> = {};
    for (const unitId of Object.keys(allUnitTraits(progressWith(), makeFullBank(), CATALOG))) {
      base[unitId] = 0;
    }
    return { ...base, ...entries };
  };

  it('ouvre la première unité de chaque matière d’emblée', () => {
    expect(unlockedUnits(traits({}), CATALOG)).toEqual(['gr-1', 'ia-1', 'py-1', 'seo-1', 'web-1']);
  });

  it('ouvre la 2e unité quand la 1re de la même matière a 1 couronne', () => {
    const t = traits({ 'seo-1': 1 });
    expect(isUnitUnlocked('seo-2', t, CATALOG)).toBe(true);
    expect(isUnitUnlocked('seo-3', t, CATALOG)).toBe(false);
    expect(isUnitUnlocked('ia-2', t, CATALOG)).toBe(false);
  });

  it('ouvre la 3e unité quand la 2e a 1 couronne', () => {
    const t = traits({ 'seo-1': 3, 'seo-2': 1 });
    expect(isUnitUnlocked('seo-3', t, CATALOG)).toBe(true);
  });

  it('garde les matières indépendantes', () => {
    const t = traits({ 'web-1': 3, 'web-2': 3 });
    expect(isUnitUnlocked('web-3', t, CATALOG)).toBe(true);
    expect(isUnitUnlocked('py-2', t, CATALOG)).toBe(false);
  });

  it('traite une unité absente de la carte comme sans couronne', () => {
    expect(isUnitUnlocked('seo-2', {}, CATALOG)).toBe(false);
  });

  it('garde fermée une unité inconnue du catalogue', () => {
    expect(isUnitUnlocked('inconnue-1', traits({}), CATALOG)).toBe(false);
  });

  it('liste les unités nouvellement ouvertes', () => {
    const before = traits({});
    const after = traits({ 'seo-1': 1, 'ia-1': 1 });
    expect(newlyUnlocked(before, after, CATALOG)).toEqual(['ia-2', 'seo-2']);
  });

  it('ne signale rien quand rien ne change', () => {
    const t = traits({ 'seo-1': 2 });
    expect(newlyUnlocked(t, t, CATALOG)).toEqual([]);
  });
});

describe('isSubjectComplete', () => {
  it('exige toutes les unités de la matière à 5 couronnes', () => {
    const t: Record<string, Traits> = { 'seo-1': 5, 'seo-2': 5, 'seo-3': 5 };
    expect(isSubjectComplete('seo', t, CATALOG)).toBe(true);
    expect(isSubjectComplete('seo', { ...t, 'seo-3': 4 }, CATALOG)).toBe(false);
    expect(isSubjectComplete('ia', t, CATALOG)).toBe(false);
  });

  it('ne considère jamais complète une matière sans unité', () => {
    expect(isSubjectComplete('inconnue', {}, CATALOG)).toBe(false);
  });
});

describe('currentUnit', () => {
  it('désigne la première unité au départ', () => {
    expect(currentUnit('seo', {}, CATALOG)).toBe('seo-1');
  });

  it('reste sur une unité ouverte tant qu’elle n’a pas 3 couronnes', () => {
    expect(currentUnit('seo', { 'seo-1': 2 }, CATALOG)).toBe('seo-1');
  });

  it('avance quand l’unité est à 3 couronnes et la suivante ouverte', () => {
    expect(currentUnit('seo', { 'seo-1': 3 }, CATALOG)).toBe('seo-2');
  });

  it('rend la dernière unité quand tout le chemin est à 3 couronnes', () => {
    expect(currentUnit('seo', { 'seo-1': 3, 'seo-2': 3, 'seo-3': 3 }, CATALOG)).toBe('seo-3');
  });

  it('rend null pour une matière sans unité', () => {
    expect(currentUnit('inconnue', {}, CATALOG)).toBeNull();
  });
});
