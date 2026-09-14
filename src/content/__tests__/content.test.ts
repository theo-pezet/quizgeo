/**
 * Intégrité du contenu : tout ce qui casserait silencieusement l'app est
 * vérifié ici, une fois pour toutes, dans les trois langues.
 */

import { CATALOG, WORLDS, WORLD_BY_UNIT, contentFor, type Content } from '..';
import { resolveUnitCards, shortDefinition } from '../generate';
import type { Lang } from '@/i18n/translate';

const MIN_EXERCISES_PER_UNIT = 5;
const LANGS: Lang[] = ['fr', 'en', 'es'];
const FR = contentFor('fr');

describe.each(LANGS)('le contenu en %s', (lang) => {
  const c: Content = contentFor(lang);

  it('a des cartes aux identifiants uniques, sans texte vide', () => {
    expect(new Set(c.CARDS.map((x) => x.id)).size).toBe(c.CARDS.length);
    for (const card of c.CARDS) {
      expect(card.term.trim()).not.toBe('');
      expect(card.definition.trim()).not.toBe('');
    }
    const known = new Set(c.SUBJECTS.map((s) => s.id));
    for (const card of c.CARDS) expect(known.has(card.subject)).toBe(true);
  });

  it('garde les mêmes identifiants et clés qu’en français', () => {
    expect(c.CARDS.map((x) => x.id)).toEqual(FR.CARDS.map((x) => x.id));
    expect(c.EXERCISES.map((e) => e.key)).toEqual(FR.EXERCISES.map((e) => e.key));
    expect(c.UNITS.map((u) => u.id)).toEqual(FR.UNITS.map((u) => u.id));
  });

  it('a des unités avec un titre et une description', () => {
    for (const unit of c.UNITS) {
      expect(unit.title.trim()).not.toBe('');
      expect(unit.description.trim()).not.toBe('');
    }
  });

  it('a des exercices cohérents', () => {
    for (const e of c.EXERCISES) {
      const ref = FR.EXERCISE_BY_KEY.get(e.key);
      expect(ref?.kind).toBe(e.kind);
      if (e.kind === 'qcm' && ref?.kind === 'qcm') {
        expect(e.choices.length).toBe(ref.choices.length);
        expect(new Set(e.choices).size).toBe(e.choices.length);
        expect(e.answer).toBe(ref.answer);
        expect(e.prompt.trim()).not.toBe('');
      }
      if (e.kind === 'cloze' && ref?.kind === 'cloze') {
        expect(e.text).toContain('___');
        expect(e.bank).not.toContain(e.answer);
      }
      if (e.kind === 'match' && ref?.kind === 'match') expect(e.pairs.length).toBe(ref.pairs.length);
      if (e.kind === 'order' && ref?.kind === 'order') expect(e.steps.length).toBe(ref.steps.length);
      if (e.kind === 'case' && ref?.kind === 'case') {
        expect(e.steps.length).toBe(ref.steps.length);
        e.steps.forEach((s, i) => expect(s.choices.length).toBe(ref.steps[i].choices.length));
      }
    }
  });

  it('ne contient pas de tiret cadratin dans les textes écrits à la main', () => {
    const manual = c.EXERCISES.filter((e) => e.key.includes(':x:'));
    for (const e of manual) expect(JSON.stringify(e)).not.toMatch(/[—–]/);
  });
});

describe('les unités', () => {
  const { UNITS, SUBJECTS, CARDS, CARD_BY_ID, exercisesOfUnit } = FR;

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

describe('les mondes', () => {
  it('couvrent chaque unité exactement une fois, dans l’ordre du chemin', () => {
    const { UNITS } = FR;
    const covered = WORLDS.flatMap((w) => w.unitIds);
    expect(covered).toEqual(UNITS.map((u) => u.id));
    for (const unit of UNITS) expect(WORLD_BY_UNIT.get(unit.id)?.subjectId).toBe(unit.subjectId);
  });

  it('sont numérotés de 1 à n par matière', () => {
    for (const s of FR.SUBJECTS) {
      const idx = WORLDS.filter((w) => w.subjectId === s.id).map((w) => w.index);
      expect(idx).toEqual(idx.map((_, i) => i + 1));
    }
  });
});

describe('les exercices', () => {
  const { EXERCISES, UNITS } = FR;

  it('ont des clés uniques et une unité connue', () => {
    expect(new Set(EXERCISES.map((e) => e.key)).size).toBe(EXERCISES.length);
    const known = new Set(UNITS.map((u) => u.id));
    for (const e of EXERCISES) expect(known.has(e.unitId)).toBe(true);
  });

  it('remise en ordre : au moins 3 étapes, toutes distinctes et non vides', () => {
    for (const lang of ['fr', 'en', 'es'] as const) {
      for (const ex of contentFor(lang).EXERCISES) {
        if (ex.kind !== 'order') continue;
        expect(ex.steps.length).toBeGreaterThanOrEqual(3);
        expect(new Set(ex.steps).size).toBe(ex.steps.length);
        for (const st of ex.steps) expect(st.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('cas pratiques : titre, scénario, décisions avec 2 à 4 choix et réponse dans les bornes', () => {
    for (const lang of ['fr', 'en', 'es'] as const) {
      for (const ex of contentFor(lang).EXERCISES) {
        if (ex.kind !== 'case') continue;
        expect(ex.title.trim().length).toBeGreaterThan(0);
        expect(ex.scenario.trim().length).toBeGreaterThan(0);
        expect(ex.steps.length).toBeGreaterThanOrEqual(2);
        for (const st of ex.steps) {
          expect(st.choices.length).toBeGreaterThanOrEqual(2);
          expect(st.choices.length).toBeLessThanOrEqual(4);
          expect(st.answer).toBeGreaterThanOrEqual(0);
          expect(st.answer).toBeLessThan(st.choices.length);
          expect(st.feedback.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('QCM : 2 à 4 choix, réponse dans les bornes', () => {
    for (const e of EXERCISES) {
      if (e.kind !== 'qcm') continue;
      expect(e.choices.length).toBeGreaterThanOrEqual(2);
      expect(e.choices.length).toBeLessThanOrEqual(4);
      expect(e.answer).toBeGreaterThanOrEqual(0);
      expect(e.answer).toBeLessThan(e.choices.length);
    }
  });
});

describe('shortDefinition', () => {
  it('retire le développement d’acronyme et tronque proprement', () => {
    expect(shortDefinition('Click-Through Rate: The percentage of people who clicked.')).toBe('The percentage of people who clicked.');
    const long = shortDefinition('A'.repeat(10) + ' ' + 'B'.repeat(100));
    expect(long.length).toBeLessThanOrEqual(73);
    expect(long.endsWith('…')).toBe(true);
  });
});
