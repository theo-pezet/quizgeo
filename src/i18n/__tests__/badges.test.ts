import { BADGES } from '@/game';

import { DICTS } from '../translate';
import { ordinal } from '../format';

describe('badges', () => {
  // L'écran Profil et la fin de session affichent t(`badge.${id}`) : une clé
  // absente se voit telle quelle (« badge.early »).
  it('ont un libellé pour chaque identifiant', () => {
    const dict = DICTS.en as Record<string, string>;
    for (const b of BADGES) expect([b.id, typeof dict[`badge.${b.id}`]]).toEqual([b.id, 'string']);
  });
});

describe('ordinal', () => {
  it('écrit les rangs en anglais', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map((n) => ordinal(n, 'en'))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd']);
    expect(ordinal(102)).toBe('102nd');
  });
});
