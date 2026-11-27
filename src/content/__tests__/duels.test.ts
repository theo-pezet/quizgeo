/**
 * La matière des duels (src/content/duels.ts) : l'indice ne donne aucun des
 * deux termes, et les paires candidates viennent des notions ratées.
 */

import { emptyCardState, emptyProgress, recordConfusion } from '@/game';

import { contentFor } from '..';
import { foldKey } from '../cardText';
import { duelCandidates, duelItem, duelsFor } from '../duels';
import { confusablesOf } from '../generate';
import type { Card } from '../types';

const c = contentFor('en');

/** Toutes les paires connues, une fois chacune. */
function knownPairs(): [Card, Card][] {
  const out: [Card, Card][] = [];
  const seen = new Set<string>();
  for (const card of c.CARDS) {
    for (const id of confusablesOf(card.id)) {
      const rival = c.CARD_BY_ID.get(id);
      const key = [card.id, id].sort().join('|');
      if (!rival || seen.has(key)) continue;
      seen.add(key);
      out.push([card, rival]);
    }
  }
  return out;
}

describe('duels', () => {
  const pairs = knownPairs();

  it('ne montrent jamais l’un des deux termes dans l’indice', () => {
    const leaks: string[] = [];
    let built = 0;
    for (const [a, b] of pairs) {
      for (const r of [0.1, 0.9]) {
        const item = duelItem(a, b, () => r);
        if (!item) continue;
        built += 1;
        for (const card of [item.target, item.other]) {
          const term = foldKey(card.term);
          if (term.length >= 4 && foldKey(item.clue).includes(term)) leaks.push(`${a.id} / ${b.id} : ${card.term}`);
        }
      }
    }
    expect(leaks).toEqual([]);
    // Assez de paires jouables pour que les duels aient du sens.
    expect(built).toBeGreaterThan(pairs.length);
  });

  it('tire la notion décrite au sort et refuse deux homonymes', () => {
    const [a, b] = pairs.find(([x, y]) => duelItem(x, y, () => 0.1) && duelItem(x, y, () => 0.9)) as [Card, Card];
    expect(duelItem(a, b, () => 0.1)?.target.id).toBe(a.id);
    expect(duelItem(a, b, () => 0.9)?.target.id).toBe(b.id);
    expect(duelItem(a, { ...b, term: a.term }, () => 0.1)).toBeNull();
  });

  it('se rabat sur l’autre notion, puis sur l’exemple, quand un indice ne tient pas', () => {
    const [a, b] = pairs.find(([x, y]) => duelItem(x, y, () => 0.1)) as [Card, Card];
    const short: Card = { ...a, definition: 'Too short.', example: '' };
    expect(duelItem(short, b, () => 0.1)?.target.id).toBe(b.id);
    const noDef: Card = { ...b, definition: 'x', example: 'A long enough example sentence that describes the idea in context.' };
    expect(duelItem(short, noDef, () => 0.1)?.source).toBe('example');
    expect(duelItem(short, { ...noDef, example: '' }, () => 0.1)).toBeNull();
  });

  it('propose les paires voisines des notions ratées, les plus oubliées d’abord', () => {
    const withRivals = c.CARDS.filter((card) => confusablesOf(card.id).some((id) => c.CARD_BY_ID.get(id)?.subject === card.subject));
    const [x, y] = withRivals;
    const cards = {
      [x.id]: { ...emptyCardState(x.id), phase: 'review' as const, lapses: 1 },
      [y.id]: { ...emptyCardState(y.id), phase: 'review' as const, lapses: 3 },
      fine: { ...emptyCardState('fine'), phase: 'review' as const },
      ghost: { ...emptyCardState('ghost'), phase: 'learning' as const },
    };
    const out = duelCandidates(cards, c.CARD_BY_ID);
    expect(out[0][0]).toBe(y.id);
    expect(out.some(([a]) => a === x.id)).toBe(true);
    for (const [a, b] of out) {
      expect(c.CARD_BY_ID.get(a)?.subject).toBe(c.CARD_BY_ID.get(b)?.subject);
    }
    // Plafonné, même avec beaucoup de notions ratées.
    const many = Object.fromEntries(withRivals.slice(0, 60).map((card) => [card.id, { ...emptyCardState(card.id), phase: 'learning' as const }]));
    expect(duelCandidates(many, c.CARD_BY_ID).length).toBe(20);
  });
});

describe('duelsFor', () => {
  it('sert d’abord les confusions personnelles, saute les cartes disparues, et plafonne', () => {
    const playable = knownPairs().filter(([a, b]) => duelItem(a, b, () => 0.1));
    const [[a, b], [x, y]] = playable;
    let p = recordConfusion(emptyProgress(), a.id, b.id);
    p = recordConfusion(p, 'carte-disparue', a.id);
    p = recordConfusion(p, x.id, y.id);
    p = recordConfusion(p, x.id, y.id);
    const out = duelsFor(p, c.CARD_BY_ID, '2026-11-27', 5, () => 0.1);
    expect(out.map((d) => [d.target.id, d.other.id].sort().join('|'))).toEqual([[x.id, y.id].sort().join('|'), [a.id, b.id].sort().join('|')]);
    expect(duelsFor(p, c.CARD_BY_ID, '2026-11-27', 1, () => 0.1)).toHaveLength(1);
    expect(duelsFor(emptyProgress(), c.CARD_BY_ID, '2026-11-27', 5, () => 0.1)).toEqual([]);
  });
});
