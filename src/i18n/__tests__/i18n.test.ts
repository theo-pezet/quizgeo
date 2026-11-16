import { DICTS, format, monthLabel, translate, type Key } from '../translate';

describe('dictionnaire', () => {
  it('n’a qu’une langue : l’anglais', () => {
    expect(Object.keys(DICTS)).toEqual(['en']);
  });

  it('ne contient ni tiret cadratin, ni pluriel mal formé, ni texte vide', () => {
    for (const [k, v] of Object.entries(DICTS.en)) {
      expect([k, v.includes('—')]).toEqual([k, false]);
      expect([k, v.trim().length > 0]).toEqual([k, true]);
      const opened = (v.match(/\(one:/g) ?? []).length;
      const closed = (v.match(/\(one:[^|)]*\|other:[^)]*\)/g) ?? []).length;
      expect([k, opened]).toEqual([k, closed]);
    }
  });

  it('ne contient plus de français ni d’espagnol', () => {
    const FOREIGN = /[àâçèêëîïôûùœ¿¡ñ]|\b(le|la|les|des|une|est|avec|pour|dans|vous|nous|tu|ton|sont|pas)\b/i;
    // Accents légitimes : le nom de l'éditeur.
    const bad = Object.entries(DICTS.en).filter(([, v]) => FOREIGN.test(v.replace(/Cité par l’IA|cite-par-lia\.fr/g, '')));
    expect(bad).toEqual([]);
  });
});

describe('format', () => {
  it('ne met au singulier que 1', () => {
    expect(format('{count} card(one:|other:s)', { count: 0 })).toBe('0 cards');
    expect(format('{count} card(one:|other:s)', { count: 1 })).toBe('1 card');
    expect(format('{count} card(one:|other:s)', { count: 2 })).toBe('2 cards');
  });

  it('laisse un paramètre absent tel quel et traduit via le dictionnaire', () => {
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
    expect(translate('en', 'common.continue')).toBe(DICTS.en['common.continue']);
    expect(translate('en', 'nope.missing' as Key)).toBe('nope.missing');
  });
});

describe('monthLabel', () => {
  it('écrit le mois en anglais, avec sa majuscule', () => {
    expect(monthLabel('en', '2026-10')).toBe('October 2026');
    expect(monthLabel('en', '2026-10', true)).toBe('October 2026');
  });
});
