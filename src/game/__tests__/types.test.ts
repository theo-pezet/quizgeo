import {
  catalogFrom,
  findUnit,
  previousUnit,
  subjectIds,
  subjectUnits,
} from '../types';
import { CATALOG } from './fixtures';

describe('catalogFrom', () => {
  it('numérote les unités dans l’ordre d’apparition, par matière', () => {
    const c = catalogFrom([
      { id: 'a-1', subjectId: 'a' },
      { id: 'b-1', subjectId: 'b' },
      { id: 'a-2', subjectId: 'a' },
    ]);
    expect(c.units).toEqual([
      { id: 'a-1', subjectId: 'a', index: 0 },
      { id: 'b-1', subjectId: 'b', index: 0 },
      { id: 'a-2', subjectId: 'a', index: 1 },
    ]);
  });
});

describe('subjectIds', () => {
  it('liste chaque matière une fois, dans l’ordre du catalogue', () => {
    expect(subjectIds(CATALOG)).toEqual(['seo', 'ia', 'py', 'web', 'gr']);
  });
});

describe('subjectUnits', () => {
  it('rend les unités d’une matière dans l’ordre du chemin', () => {
    expect(subjectUnits(CATALOG, 'ia').map((u) => u.id)).toEqual(['ia-1', 'ia-2', 'ia-3']);
  });

  it('rend une liste vide pour une matière inconnue', () => {
    expect(subjectUnits(CATALOG, 'x')).toEqual([]);
  });
});

describe('findUnit / previousUnit', () => {
  it('retrouve une unité par son identifiant', () => {
    expect(findUnit(CATALOG, 'py-2')).toEqual({ id: 'py-2', subjectId: 'py', index: 1 });
    expect(findUnit(CATALOG, 'nope')).toBeUndefined();
  });

  it('rend l’unité précédente du même chemin', () => {
    expect(previousUnit(CATALOG, 'py-3')?.id).toBe('py-2');
  });

  it('rend null pour la première unité ou une unité inconnue', () => {
    expect(previousUnit(CATALOG, 'py-1')).toBeNull();
    expect(previousUnit(CATALOG, 'nope')).toBeNull();
  });
});
