import { applyAnswerAction } from '../apply';
import { MASTERED_WINS, applyDuel, isMastered, pairKey, pickDuelPairs, recordConfusion } from '../duels';
import { emptyProgress, type Exercise } from '../types';

const D1 = '2026-11-27';
const D2 = '2026-11-28';
const D3 = '2026-11-29';

describe('paires confondues', () => {
  it('a une clé indépendante de l\'ordre', () => {
    expect(pairKey('b', 'a')).toBe('a|b');
    expect(pairKey('a', 'b')).toBe('a|b');
  });

  it('enregistre une confusion et remet la série à zéro', () => {
    let p = recordConfusion(emptyProgress(), 'css-rule', 'css-selector');
    p = applyDuel(p, 'css-rule', 'css-selector', true, D1);
    p = recordConfusion(p, 'css-selector', 'css-rule');
    expect(p.confusions['css-rule|css-selector']).toEqual({ a: 'css-rule', b: 'css-selector', misses: 2, wins: 0, lastWinDay: D1 });
    expect(recordConfusion(p, 'x', 'x')).toBe(p);
  });

  it('se maîtrise en trois victoires, un jour différent chaque fois', () => {
    let p = applyDuel(emptyProgress(), 'b', 'a', true, D1);
    p = applyDuel(p, 'a', 'b', true, D1);
    expect(p.confusions['a|b'].wins).toBe(1);
    p = applyDuel(p, 'a', 'b', true, D2);
    expect(isMastered(p.confusions['a|b'])).toBe(false);
    p = applyDuel(p, 'a', 'b', true, D3);
    expect(p.confusions['a|b'].wins).toBe(MASTERED_WINS);
    expect(isMastered(p.confusions['a|b'])).toBe(true);
  });

  it('une défaite remet tout à zéro', () => {
    let p = applyDuel(emptyProgress(), 'a', 'b', true, D1);
    p = applyDuel(p, 'a', 'b', false, D2);
    expect(p.confusions['a|b']).toEqual({ a: 'a', b: 'b', misses: 1, wins: 0, lastWinDay: null });
  });
});

describe('choix des duels', () => {
  it('les confusions personnelles d\'abord, les plus ratées en tête, puis les candidates', () => {
    let p = recordConfusion(emptyProgress(), 'a', 'b');
    p = recordConfusion(p, 'c', 'd');
    p = recordConfusion(p, 'd', 'c');
    p = recordConfusion(p, 'e', 'f');
    p = applyDuel(p, 'e', 'f', true, D1);
    const picked = pickDuelPairs(p.confusions, [['h', 'g'], ['a', 'b'], ['g', 'h'], ['z', 'z']], D2, 10);
    expect(picked).toEqual([['c', 'd'], ['a', 'b'], ['e', 'f'], ['g', 'h']]);
  });

  it('écarte les paires maîtrisées, celles gagnées aujourd\'hui et les candidates déjà jouées', () => {
    let p = emptyProgress();
    for (const day of [D1, D2, D3]) p = applyDuel(p, 'a', 'b', true, day);
    p = applyDuel(p, 'c', 'd', true, D3);
    expect(pickDuelPairs(p.confusions, [['a', 'b']], D3, 5)).toEqual([]);
    expect(pickDuelPairs(p.confusions, [], D3, 0)).toEqual([]);
    expect(pickDuelPairs(p.confusions, [['x', 'y'], ['y', 'z']], D3, 1)).toEqual([['x', 'y']]);
  });

  it('naît d\'une mauvaise réponse de vocabulaire en leçon', () => {
    const q: Exercise = { kind: 'qcm', key: 'u1:term:card-a', unitId: 'u1', cardId: 'card-a', prompt: 'p', choices: ['A', 'B'], answer: 0 };
    const now = new Date(`${D1}T10:00:00`);
    const wrong = applyAnswerAction(emptyProgress(), { question: q, correct: false, mode: 'unit', chrono: false, now, creditedThisSession: false, confusedWith: 'card-b' });
    expect(wrong.progress.confusions['card-a|card-b'].misses).toBe(1);
    const right = applyAnswerAction(emptyProgress(), { question: q, correct: true, mode: 'unit', chrono: false, now, creditedThisSession: false, confusedWith: 'card-b' });
    expect(right.progress.confusions).toEqual({});
    const noCard = applyAnswerAction(emptyProgress(), { question: { ...q, cardId: undefined }, correct: false, mode: 'unit', chrono: false, now, creditedThisSession: false, confusedWith: 'card-b' });
    expect(noCard.progress.confusions).toEqual({});
  });
});
