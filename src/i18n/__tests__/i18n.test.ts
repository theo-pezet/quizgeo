import { DICTS, format, monthLabel, translate, type Key } from '../translate';

const LANGS = ['fr', 'en', 'es'] as const;
const params = (v: string) => [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('dictionnaires', () => {
  it('ont les mêmes clés et les mêmes paramètres dans les trois langues', () => {
    const keys = Object.keys(DICTS.fr) as Key[];
    for (const lang of LANGS) {
      expect(Object.keys(DICTS[lang]).sort()).toEqual([...keys].sort());
      for (const k of keys) expect([lang, k, params(DICTS[lang][k])]).toEqual([lang, k, params(DICTS.fr[k])]);
    }
  });

  it('ne contiennent ni tiret cadratin ni pluriel mal formé', () => {
    for (const lang of LANGS) {
      for (const [k, v] of Object.entries(DICTS[lang])) {
        expect([lang, k, v.includes('—')]).toEqual([lang, k, false]);
        const opened = (v.match(/\(one:/g) ?? []).length;
        const closed = (v.match(/\(one:[^|)]*\|other:[^)]*\)/g) ?? []).length;
        expect([lang, k, opened]).toEqual([lang, k, closed]);
      }
    }
  });
});

describe('format', () => {
  it('met 0 et 1 au singulier en français, seulement 1 ailleurs', () => {
    const tpl = '{count} carte(one:|other:s)';
    expect(format(tpl, { count: 0 }, 'fr')).toBe('0 carte');
    expect(format(tpl, { count: 1 }, 'fr')).toBe('1 carte');
    expect(format(tpl, { count: 2 }, 'fr')).toBe('2 cartes');
    expect(format('{count} card(one:|other:s)', { count: 0 }, 'en')).toBe('0 cards');
    expect(format('{count} card(one:|other:s)', { count: 1 }, 'en')).toBe('1 card');
  });

  it('laisse un paramètre absent tel quel et traduit via le dictionnaire', () => {
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
    expect(translate('fr', 'common.continue')).toBe(DICTS.fr['common.continue']);
  });
});

describe('monthLabel', () => {
  it('garde la minuscule dans une phrase et la majuscule en libellé isolé', () => {
    expect(monthLabel('fr', '2026-10')).toBe('octobre 2026');
    expect(monthLabel('fr', '2026-10', true)).toBe('Octobre 2026');
  });
});
