/**
 * Les visages des cartes du deck (src/content/faces.ts) : jamais de réponse
 * donnée côté question, et assez de cartes pour que la rotation ait du sens.
 */

import { contentFor } from '..';
import { foldKey } from '../cardText';
import { faceAvailability, faceMaterial } from '../faces';

const c = contentFor('en');

describe('visages des cartes', () => {
  const all = c.CARDS.map((card) => ({ card, m: faceMaterial(card, c.CARD_BY_ID) }));

  it('ne montrent jamais le terme côté question', () => {
    const leaks: string[] = [];
    for (const { card, m } of all) {
      const term = foldKey(card.term);
      if (term.length < 4) continue;
      for (const text of [m.definition, m.example, m.duel?.definition]) {
        if (text && foldKey(text).includes(term)) leaks.push(`${card.id}: ${text.slice(0, 60)}`);
      }
      if (m.duel && foldKey(m.duel.definition).includes(foldKey(m.duel.rival.term)) && foldKey(m.duel.rival.term).length >= 4) leaks.push(`${card.id} (duel)`);
    }
    expect(leaks).toEqual([]);
  });

  it('opposent en duel deux notions du même sous-thème', () => {
    for (const { card, m } of all) {
      if (!m.duel) continue;
      expect([card.id, m.duel.rival.topic, m.duel.rival.subject]).toEqual([card.id, card.topic, card.subject]);
      expect(m.duel.rival.id).not.toBe(card.id);
    }
  });

  it('proposent une face inversée pour presque toutes les cartes', () => {
    const withReverse = all.filter(({ m }) => faceAvailability(m).definition).length;
    expect(withReverse / all.length).toBeGreaterThan(0.95);
    expect(all.filter(({ m }) => m.example).length).toBeGreaterThan(1000);
    expect(all.filter(({ m }) => m.duel).length).toBeGreaterThan(300);
  });

  it('mémorisent le résultat par carte', () => {
    const card = c.CARDS[0];
    expect(faceMaterial(card, c.CARD_BY_ID)).toBe(faceMaterial(card, c.CARD_BY_ID));
  });
});
