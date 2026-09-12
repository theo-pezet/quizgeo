import { SKIP_TEST_MIN_SCORE, applyBlitzResult, applySkipTestPassed } from '../apply';
import { unitTraits } from '../mastery';
import { CATALOG, makeUnit, progressWith, withQuestionState } from './fixtures';

const NOW = new Date(2026, 8, 9, 19, 30);
const bank = [...makeUnit('seo-1', 4), ...makeUnit('seo-2', 4), ...makeUnit('seo-3', 4), ...makeUnit('ia-1', 4)];

describe('applyBlitzResult', () => {
  it('retient le meilleur score par matière', () => {
    const first = applyBlitzResult(progressWith(), 'seo', 12);
    expect(first.isBest).toBe(true);
    expect(first.progress.blitz.seo).toBe(12);
    const lower = applyBlitzResult(first.progress, 'seo', 9);
    expect(lower.isBest).toBe(false);
    expect(lower.progress).toBe(first.progress);
    const higher = applyBlitzResult(first.progress, 'seo', 15);
    expect(higher.progress.blitz.seo).toBe(15);
    expect(applyBlitzResult(first.progress, 'ia', 3).progress.blitz).toEqual({ seo: 12, ia: 3 });
  });
});

describe('applySkipTestPassed', () => {
  it('valide les unités précédentes sans couronne, à 2 couronnes', () => {
    const r = applySkipTestPassed(progressWith(), 'seo-3', bank, CATALOG, NOW);
    expect(r.validatedUnits).toEqual(['seo-1', 'seo-2']);
    expect(unitTraits(r.progress, 'seo-1', bank)).toBe(2);
    expect(unitTraits(r.progress, 'seo-2', bank)).toBe(2);
    expect(unitTraits(r.progress, 'seo-3', bank)).toBe(0);
    expect(r.progress.units['seo-1'].firstTraitEarned).toBe(true);
    expect(r.progress.questions['Q-SEO-1-1'].lastSeenAt).toBe(NOW.toISOString());
  });

  it('ne touche ni aux unités déjà couronnées, ni aux autres matières, ni à l’unité cible', () => {
    let p = withQuestionState(progressWith(), makeUnit('seo-1', 4), { seen: 5, streak: 4 });
    p = applySkipTestPassed(p, 'seo-3', bank, CATALOG, NOW).progress;
    expect(unitTraits(p, 'seo-1', bank)).toBe(5);
    expect(unitTraits(p, 'ia-1', bank)).toBe(0);
    expect(p.units['seo-3']).toBeUndefined();
  });

  it('ne fait rien sur une unité inconnue ou déjà première de son chemin', () => {
    expect(applySkipTestPassed(progressWith(), 'inconnue', bank, CATALOG, NOW).validatedUnits).toEqual([]);
    expect(applySkipTestPassed(progressWith(), 'seo-1', bank, CATALOG, NOW).validatedUnits).toEqual([]);
  });

  it('exige 8 sur 10', () => {
    expect(SKIP_TEST_MIN_SCORE).toBe(8);
  });
});
