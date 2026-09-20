import {
  SESSION_LENGTH,
  composeFreeSession,
  composeReviewSession,
  composeUnitSession,
  hasNoImmediateRepeat,
  presentQcm,
  shuffle,
  xpModeFor,
} from '../session';
import { emptyQuestionProgress, type QcmExercise, type QuestionProgress } from '../types';
import { makeExercise, makeUnit, mulberry32, rngZero } from './fixtures';

const unit4 = makeUnit('seo-2', 4);
const unit5 = makeUnit('web-3', 5);

describe('shuffle', () => {
  it('conserve tous les éléments', () => {
    const out = shuffle([1, 2, 3, 4, 5], mulberry32(7));
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('ne mute pas l’entrée', () => {
    const input = [1, 2, 3];
    shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3]);
  });

  it('gère la liste vide et le singleton', () => {
    expect(shuffle([], rngZero)).toEqual([]);
    expect(shuffle(['a'], rngZero)).toEqual(['a']);
  });
});

describe('composeUnitSession', () => {
  it('rend exactement 10 questions à partir de 4', () => {
    expect(composeUnitSession(unit4, mulberry32(1))).toHaveLength(SESSION_LENGTH);
  });

  it('rend exactement 10 questions à partir de 5', () => {
    expect(composeUnitSession(unit5, mulberry32(2))).toHaveLength(SESSION_LENGTH);
  });

  it('ne pose jamais deux fois la même question d’affilée, sur 500 tirages', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      expect(hasNoImmediateRepeat(composeUnitSession(unit4, mulberry32(seed)))).toBe(true);
      expect(hasNoImmediateRepeat(composeUnitSession(unit5, mulberry32(seed)))).toBe(true);
    }
  });

  it('tient le raccord même avec un RNG dégénéré qui ne mélange rien', () => {
    const out = composeUnitSession(unit4, rngZero);
    expect(hasNoImmediateRepeat(out)).toBe(true);
  });

  it('sert 70 % d’exercices prioritaires quand l’unité en a, et le reste en vocabulaire', () => {
    const code = makeUnit('py-2', 12).map((q, i) => ({ ...q, key: `py-2:c:${i}`, priority: true }));
    const vocab = makeUnit('py-2', 8);
    for (let seed = 0; seed < 50; seed += 1) {
      const out = composeUnitSession([...code, ...vocab], mulberry32(seed));
      expect(out).toHaveLength(SESSION_LENGTH);
      expect(out.filter((q) => q.priority).length).toBe(7);
      expect(hasNoImmediateRepeat(out)).toBe(true);
    }
    // Peu d'exercices prioritaires : tous servis, le reste complète.
    const few = composeUnitSession([...code.slice(0, 2), ...vocab], mulberry32(1));
    expect(few.filter((q) => q.priority).length).toBe(2);
    // Peu de vocabulaire : on cycle sur la petite réserve sans jamais dépasser 10.
    const little = composeUnitSession([...code, ...vocab.slice(0, 1)], mulberry32(2));
    expect(little).toHaveLength(SESSION_LENGTH);
    expect(little.filter((q) => !q.priority).length).toBeGreaterThanOrEqual(1);
    // Que des prioritaires : comportement inchangé.
    expect(composeUnitSession(code, mulberry32(3))).toHaveLength(SESSION_LENGTH);
  });

  it('distribue les questions équitablement sur un cycle complet', () => {
    const out = composeUnitSession(unit5, mulberry32(3));
    const counts = new Map<string, number>();
    for (const q of out) counts.set(q.key, (counts.get(q.key) ?? 0) + 1);
    // 10 questions, 5 distinctes : deux passages complets.
    expect([...counts.values()]).toEqual([2, 2, 2, 2, 2]);
  });

  it('rend une liste vide pour une unité sans question', () => {
    expect(composeUnitSession([], mulberry32(1))).toEqual([]);
  });

  it('accepte la répétition forcée d’une unité à une seule question', () => {
    const single = [makeExercise('Q-SOLO-1', 'py-1')];
    const out = composeUnitSession(single, mulberry32(1));
    expect(out).toHaveLength(SESSION_LENGTH);
    expect(hasNoImmediateRepeat(out)).toBe(false);
  });
});

describe('composeReviewSession', () => {
  const bank = [...unit4, ...unit5, ...makeUnit('py-1', 4)];
  const byKey = new Map(bank.map((q) => [q.key, q]));
  const entry = (key: string, lastSeenAt: string): QuestionProgress => ({
    ...emptyQuestionProgress(key),
    inReview: true,
    lastSeenAt,
  });

  it('trie par lastSeenAt croissant', () => {
    const queue = [
      entry(bank[2].key, '2026-09-09T12:00:00.000Z'),
      entry(bank[0].key, '2026-09-01T12:00:00.000Z'),
      entry(bank[1].key, '2026-09-05T12:00:00.000Z'),
    ];
    expect(composeReviewSession(queue, byKey).map((q) => q.key)).toEqual([
      bank[0].key,
      bank[1].key,
      bank[2].key,
    ]);
  });

  it('plafonne à 10 questions', () => {
    const queue = bank.map((q, i) => entry(q.key, `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`));
    expect(composeReviewSession(queue, byKey)).toHaveLength(SESSION_LENGTH);
  });

  it('rend une session PLUS COURTE si la file en compte moins de 10', () => {
    const queue = [entry(bank[0].key, '2026-09-01T00:00:00.000Z')];
    expect(composeReviewSession(queue, byKey)).toHaveLength(1);
  });

  it('ignore une question de la file absente du fichier courant', () => {
    // Une question retirée du questions.json distant garde sa progression
    // mais ne doit plus être posée.
    const queue = [entry('Q-DISPARUE-9', '2026-09-01T00:00:00.000Z')];
    expect(composeReviewSession(queue, byKey)).toEqual([]);
  });

  it('rend une liste vide sur une file vide', () => {
    expect(composeReviewSession([], byKey)).toEqual([]);
  });
});

describe('composeFreeSession', () => {
  const pool = [...unit4, ...unit5, ...makeUnit('gr-1', 4)];

  it('rend 10 questions sans doublon quand le vivier le permet', () => {
    const out = composeFreeSession(pool, mulberry32(5));
    expect(out).toHaveLength(SESSION_LENGTH);
    expect(new Set(out.map((q) => q.key)).size).toBe(SESSION_LENGTH);
  });

  it('cycle sans répétition immédiate si le vivier est trop petit', () => {
    const small = unit4;
    const out = composeFreeSession(small, mulberry32(6));
    expect(out).toHaveLength(SESSION_LENGTH);
    expect(hasNoImmediateRepeat(out)).toBe(true);
  });

  it('rend une liste vide sur un vivier vide', () => {
    expect(composeFreeSession([], mulberry32(1))).toEqual([]);
  });
});

describe('presentQcm', () => {
  const question: QcmExercise = makeExercise('Q-FOND-001', 'py-1', 1);

  it('conserve les quatre libellés et suit la bonne réponse', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const p = presentQcm(question, mulberry32(seed));
      expect(p.choices).toHaveLength(4);
      expect([...p.choices].sort()).toEqual([...question.choices].sort());
      expect(p.choices[p.answer]).toBe(question.choices[question.answer]);
    }
  });

  it('produit des ordres différents entre deux apparitions', () => {
    const rng = mulberry32(11);
    const orders = new Set<string>();
    for (let i = 0; i < 40; i += 1) orders.add(presentQcm(question, rng).order.join(''));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('expose l’ordre d’origine des choix', () => {
    const p = presentQcm(question, rngZero);
    expect([...p.order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('ne mélange jamais un vrai/faux', () => {
    const vf: QcmExercise = { ...question, choices: ['Vrai', 'Faux'], answer: 1 };
    for (let seed = 0; seed < 50; seed += 1) {
      const p = presentQcm(vf, mulberry32(seed));
      expect(p.choices).toEqual(['Vrai', 'Faux']);
      expect(p.answer).toBe(1);
    }
  });
});

describe('xpModeFor', () => {
  it('transmet le mode tel quel', () => {
    expect(xpModeFor('unit')).toBe('unit');
    expect(xpModeFor('review')).toBe('review');
  });
});

describe('hasNoImmediateRepeat', () => {
  it('détecte une répétition', () => {
    expect(hasNoImmediateRepeat([unit4[0], unit4[0]])).toBe(false);
    expect(hasNoImmediateRepeat([unit4[0], unit4[1]])).toBe(true);
    expect(hasNoImmediateRepeat([])).toBe(true);
  });
});
