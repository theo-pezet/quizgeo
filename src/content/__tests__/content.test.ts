/**
 * Intégrité du contenu : tout ce qui casserait silencieusement l'app est
 * vérifié ici, une fois pour toutes. Le contenu est en anglais uniquement
 * depuis la 1.3.
 */

import { CATALOG, WORLDS, WORLD_BY_UNIT, contentFor, type Content } from '..';
import { isConfusable, resolveUnitCards, shortDefinition, shownDefinition } from '../generate';
import keysV12 from './keys-v1.2.json';

const MIN_EXERCISES_PER_UNIT = 5;
const EN: Content = contentFor('en');

describe('le contenu', () => {
  const c = EN;

  it('a des cartes aux identifiants uniques, sans texte vide', () => {
    expect(new Set(c.CARDS.map((x) => x.id)).size).toBe(c.CARDS.length);
    for (const card of c.CARDS) {
      expect(card.term.trim()).not.toBe('');
      expect(card.definition.trim()).not.toBe('');
    }
    const known = new Set(c.SUBJECTS.map((s) => s.id));
    for (const card of c.CARDS) expect(known.has(card.subject)).toBe(true);
  });

  // Depuis la 1.4.3, une unité peut gagner des exercices ; elle ne doit jamais en perdre.
  it('garde, unité par unité, toutes les clés d’exercice de la 1.2 (la progression et les couronnes y sont rattachées)', () => {
    const frozen = keysV12 as Record<string, string[]>;
    for (const [unitId, keys] of Object.entries(frozen)) {
      const now = new Set(c.exercisesOfUnit(unitId).map((e) => e.key));
      expect({ unitId, missing: keys.filter((k) => !now.has(k)) }).toEqual({ unitId, missing: [] });
    }
  });

  it('a des unités avec un titre et une description', () => {
    for (const unit of c.UNITS) {
      expect(unit.title.trim()).not.toBe('');
      expect(unit.description.trim()).not.toBe('');
    }
  });

  it('a des choix distincts et des textes non vides', () => {
    for (const e of c.EXERCISES) {
      if (e.kind === 'qcm') {
        expect({ key: e.key, distinct: new Set(e.choices).size === e.choices.length }).toEqual({ key: e.key, distinct: true });
        expect(e.prompt.trim()).not.toBe('');
      }
      if (e.kind === 'cloze') {
        expect(e.text).toContain('___');
        expect(e.bank).not.toContain(e.answer);
      }
    }
  });

  it('ne contient pas de tiret cadratin dans les textes écrits à la main', () => {
    const manual = c.EXERCISES.filter((e) => e.key.includes(':x:'));
    for (const e of manual) expect(JSON.stringify(e)).not.toMatch(/[—–]/);
  });

  it('ne contient plus de français ni d’espagnol (textes, code et sorties compris)', () => {
    const FOREIGN = /[àâçéèêëîïôûùœ¿¡ñ]|\b(le|la|les|des|une|est|avec|pour|dans|vous|nous|sont|pas|sur|notre)\b/;
    // Ce qui reste en français l'est exprès : noms propres, la mention légale
    // française exacte, un exemple d'encodage, et les exercices sur l'attribut
    // HTML « lang » (une page en français).
    const ALLOWED = /Théo|Genève|Gen\\u00e8ve|Cafetière|Publicité|Collaboration commerciale avec Marque X|Collaboration commerciale|Le Chat|Boréal Cosmétiques|Café|Léa|\\?"é\\?"|Bienvenue sur notre boutique|Bonjour|Français/g;
    const LANG_LESSONS = new Set(['web-html-2:w:4', 'web-html-4:w:1', 'web-html-4:w:7']);
    const texts: { where: string; text: string }[] = [];
    for (const card of c.CARDS) texts.push({ where: card.id, text: `${card.term} ${card.definition} ${card.example}` });
    for (const e of c.EXERCISES) if (!LANG_LESSONS.has(e.key)) texts.push({ where: e.key, text: JSON.stringify({ ...e, key: '', unitId: '', cardId: '' }) });
    for (const u of c.UNITS) texts.push({ where: u.id, text: `${u.title} ${u.description}` });
    const bad = texts.filter((x) => FOREIGN.test(x.text.replace(ALLOWED, '')));
    expect(bad.map((x) => x.where)).toEqual([]);
  });
});

describe('les unités', () => {
  const { UNITS, SUBJECTS, CARDS, CARD_BY_ID, exercisesOfUnit } = EN;

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
    const { UNITS } = EN;
    const covered = WORLDS.flatMap((w) => w.unitIds);
    expect(covered).toEqual(UNITS.map((u) => u.id));
    for (const unit of UNITS) expect(WORLD_BY_UNIT.get(unit.id)?.subjectId).toBe(unit.subjectId);
  });

  it('sont numérotés de 1 à n par matière', () => {
    for (const s of EN.SUBJECTS) {
      const idx = WORLDS.filter((w) => w.subjectId === s.id).map((w) => w.index);
      expect(idx).toEqual(idx.map((_, i) => i + 1));
    }
  });
});

describe('les exercices', () => {
  const { EXERCISES, UNITS } = EN;

  it('ont des clés uniques et une unité connue', () => {
    expect(new Set(EXERCISES.map((e) => e.key)).size).toBe(EXERCISES.length);
    const known = new Set(UNITS.map((u) => u.id));
    for (const e of EXERCISES) expect(known.has(e.unitId)).toBe(true);
  });

  it('remise en ordre : au moins 3 étapes, toutes distinctes et non vides', () => {
    for (const ex of EN.EXERCISES) {
      if (ex.kind !== 'order') continue;
      expect(ex.steps.length).toBeGreaterThanOrEqual(3);
      expect(new Set(ex.steps).size).toBe(ex.steps.length);
      for (const st of ex.steps) expect(st.trim().length).toBeGreaterThan(0);
    }
  });

  it('cas pratiques : titre, scénario, décisions avec 2 à 4 choix et réponse dans les bornes', () => {
    {
      for (const ex of EN.EXERCISES) {
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

  it('QCM générés : aucun distracteur confondable avec la bonne réponse, aucun choix en double', () => {
    {
      const lang = 'en' as const;
      const c = EN;
      const byId = new Map(c.CARDS.map((card) => [card.id, card]));
      const defToId = new Map<string, string>();
      for (const card of c.CARDS) defToId.set(shownDefinition(card, lang, 'choice').text, card.id);
      const termToId = new Map<string, string>();
      for (const card of c.CARDS) termToId.set(card.term.toLowerCase(), card.id);
      for (const ex of c.EXERCISES) {
        if (ex.kind !== 'qcm' || !ex.cardId) continue;
        expect(new Set(ex.choices.map((x) => x.trim().toLowerCase())).size).toBe(ex.choices.length);
        const isDef = ex.key.includes(':def:');
        for (let i = 0; i < ex.choices.length; i++) {
          if (i === ex.answer) continue;
          const other = isDef ? defToId.get(ex.choices[i]) : termToId.get(ex.choices[i].toLowerCase());
          if (!other || other === ex.cardId) continue;
          expect({ key: ex.key, other, confusable: isConfusable(ex.cardId, other) }).toEqual({ key: ex.key, other, confusable: false });
        }
      }
      expect(byId.size).toBe(c.CARDS.length);
    }
  });

  it('ligne fautive : 2 à 8 lignes, réponse dans les bornes', () => {
    for (const ex of EN.EXERCISES) {
      if (ex.kind !== 'bugline') continue;
      expect(ex.lines.length).toBeGreaterThanOrEqual(2);
      expect(ex.lines.length).toBeLessThanOrEqual(8);
      expect(ex.answer).toBeGreaterThanOrEqual(0);
      expect(ex.answer).toBeLessThan(ex.lines.length);
      expect(ex.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it('assemblage : au moins 3 morceaux, 0 à 4 intrus, aucun intrus égal à un morceau de la solution', () => {
    for (const ex of EN.EXERCISES) {
      if (ex.kind !== 'compose') continue;
      expect(ex.tokens.length).toBeGreaterThanOrEqual(3);
      expect(ex.extra.length).toBeLessThanOrEqual(4);
      for (const x of ex.extra) expect(ex.tokens).not.toContain(x);
    }
  });

  it('QCM avec explication par choix : une entrée par choix, aucune pour la bonne réponse', () => {
    for (const ex of EN.EXERCISES) {
      if (ex.kind !== 'qcm' || !ex.whyWrong) continue;
      expect(ex.whyWrong.length).toBe(ex.choices.length);
      expect(ex.whyWrong[ex.answer] ?? null).toBeNull();
      ex.whyWrong.forEach((w, i) => {
        if (i !== ex.answer) expect((w ?? '').trim().length).toBeGreaterThan(0);
      });
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
    expect(shortDefinition('Click-Through Rate: The percentage of people who clicked.', 90, 'CTR')).toBe('The percentage of people who clicked.');
    const long = shortDefinition('A'.repeat(10) + ' ' + 'B'.repeat(100));
    expect(long.length).toBeLessThanOrEqual(91);
    expect(long.endsWith('…')).toBe(true);
  });
});
