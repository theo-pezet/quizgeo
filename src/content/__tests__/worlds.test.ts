import { UNIT_IDS, WORLDS, isWorldComplete, type World } from '@/content';

describe('mondes', () => {
  it('un monde vide n’est jamais « terminé »', () => {
    const empty: World = { ...WORLDS[0], unitIds: [] };
    expect(isWorldComplete(empty, {}, 3)).toBe(false);
  });

  it('chaque monde livré contient au moins une unité existante', () => {
    const ids = new Set(UNIT_IDS);
    const empty = WORLDS.filter((w) => !w.unitIds.some((id) => ids.has(id))).map((w) => w.id);
    expect(empty).toEqual([]);
  });
});
