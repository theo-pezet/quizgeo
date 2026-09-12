/**
 * Intégrité du contenu : tout ce qui casserait silencieusement l'app est
 * vérifié ici, une fois pour toutes.
 */

import { CARDS, CARD_BY_ID, CATALOG, EXERCISES, SUBJECTS, UNITS, exercisesOfUnit } from '..';
import { resolveUnitCards, shortDefinition } from '../generate';

const MIN_EXERCISES_PER_UNIT = 5;

describe('le deck', () => {
  it('a des identifiants uniques', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });

  it('ne référence que des matières connues', () => {
    const known = new Set(SUBJECTS.map((s) => s.id));
    for (const card of CARDS) expect(known.has(card.subject)).toBe(true);
  });
});

describe('les unités', () => {
  it('ont des identifiants uniques et une matière connue', () => {
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
    const known = new Set(SUBJECTS.map((s) => s.id));
    for (const unit of UNITS) expect(known.has(unit.subjectId)).toBe(true);
  });

  it('ne citent que des cartes qui existent', () => {
    for (const unit of UNITS) {
      if (unit.cards.length > 0 && typeof unit.cards[0] === 'string') {
        for (const id of unit.cards as string[]) {
          expect({ unit: unit.id, id, exists: CARD_BY_ID.has(id) }).toEqual({ unit: unit.id, id, exists: true });
        }
      }
    }
  });

  it('ont des tranches qui rendent bien des cartes', () => {
    for (const unit of UNITS) {
      if (unit.cards.length > 0 && typeof unit.cards[0] !== 'string') {
        const cards = resolveUnitCards(unit, CARDS);
        expect({ unit: unit.id, count: cards.length }).toEqual({ unit: unit.id, count: expect.any(Number) });
        expect(cards.length).toBeGreaterThanOrEqual(3);
        expect(cards.length).toBeLessThanOrEqual(14);
      }
    }
  });

  it(`ont chacune au moins ${MIN_EXERCISES_PER_UNIT} exercices`, () => {
    for (const unit of UNITS) {
      const n = exercisesOfUnit(unit.id).length;
      expect({ unit: unit.id, ok: n >= MIN_EXERCISES_PER_UNIT, n }).toEqual({ unit: unit.id, ok: true, n });
    }
  });

  it('forment le catalogue dans le même ordre', () => {
    expect(CATALOG.units.map((u) => u.id)).toEqual(UNITS.map((u) => u.id));
    expect(CATALOG.units.filter((u) => u.subjectId === 'marketing')[0].index).toBe(0);
  });
});

describe('les exercices', () => {
  it('ont des clés uniques', () => {
    const keys = EXERCISES.map((e) => e.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it('appartiennent tous à une unité du chemin', () => {
    const units = new Set(UNITS.map((u) => u.id));
    for (const e of EXERCISES) expect({ key: e.key, ok: units.has(e.unitId) }).toEqual({ key: e.key, ok: true });
  });

  it('sont bien formés', () => {
    for (const e of EXERCISES) {
      switch (e.kind) {
        case 'qcm':
          expect(e.choices.length).toBeGreaterThanOrEqual(2);
          expect(e.choices.length).toBeLessThanOrEqual(4);
          expect(e.answer).toBeGreaterThanOrEqual(0);
          expect(e.answer).toBeLessThan(e.choices.length);
          expect(new Set(e.choices).size).toBe(e.choices.length);
          break;
        case 'cloze':
          expect(e.text).toContain('___');
          expect(e.bank).not.toContain(e.answer);
          expect(e.bank.length).toBeGreaterThanOrEqual(2);
          break;
        case 'match':
          expect(e.pairs.length).toBeGreaterThanOrEqual(3);
          expect(new Set(e.pairs.map((p) => p.right)).size).toBe(e.pairs.length);
          break;
        case 'order':
          expect(e.steps.length).toBeGreaterThanOrEqual(3);
          break;
        case 'case':
          expect(e.steps.length).toBeGreaterThanOrEqual(2);
          for (const step of e.steps) expect(step.answer).toBeLessThan(step.choices.length);
          break;
      }
    }
  });

  it('sont générés de façon stable (même clé, même contenu)', () => {
    const a = exercisesOfUnit('mkt-seo-1').map((e) => JSON.stringify(e));
    const b = exercisesOfUnit('mkt-seo-1').map((e) => JSON.stringify(e));
    expect(a).toEqual(b);
  });
});

describe('shortDefinition', () => {
  it('retire le développement d’acronyme et tronque sur un espace', () => {
    expect(shortDefinition('Click-Through Rate: The percentage of people who clicked.')).toBe(
      'The percentage of people who clicked.',
    );
    const long = shortDefinition('A'.repeat(20) + ' ' + 'B'.repeat(60) + ' ' + 'C'.repeat(20), 72);
    expect(long.endsWith('…')).toBe(true);
    expect(long.length).toBeLessThanOrEqual(73);
  });
});
