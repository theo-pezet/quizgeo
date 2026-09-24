import { BADGES } from '@/game';

import { DICTS } from '../translate';
import { ordinal } from '../format';

describe('badges', () => {
  // L'écran Profil et la fin de session affichent t(`badge.${id}`) : une clé
  // absente se voit telle quelle (« badge.early »).
  it('ont un libellé pour chaque identifiant, dans les trois langues', () => {
    for (const lang of ['fr', 'en', 'es'] as const) {
      const dict = DICTS[lang] as Record<string, string>;
      for (const b of BADGES) expect([lang, b.id, typeof dict[`badge.${b.id}`]]).toEqual([lang, b.id, 'string']);
    }
  });
});

describe('ordinal', () => {
  it('écrit les rangs dans chaque langue', () => {
    expect([1, 2, 21].map((n) => ordinal(n, 'fr'))).toEqual(['1ᵉʳ', '2ᵉ', '21ᵉ']);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map((n) => ordinal(n, 'en'))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd']);
    expect(ordinal(3, 'es')).toBe('3.º');
  });
});
