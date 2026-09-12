import {
  DEFAULT_DECK_SESSION,
  EASE_MIN,
  EASE_START,
  MAX_INTERVAL,
  composeDeckSession,
  deckStats,
  emptyCardState,
  gradeIsCorrect,
  isDue,
  previewIntervals,
  reviewCard,
} from '../srs';
import type { CardState } from '../types';
import { mulberry32, rngZero } from './fixtures';

const TODAY = '2026-09-09';
const NOW = '2026-09-09T10:00:00.000Z';

const reviewing = (intervalDays: number, ease = EASE_START, due = TODAY): CardState => ({
  ...emptyCardState('c'),
  phase: 'review',
  intervalDays,
  ease,
  due,
  reps: 5,
});

describe('isDue', () => {
  it('considère due une carte inconnue ou jamais planifiée', () => {
    expect(isDue(undefined, TODAY)).toBe(true);
    expect(isDue(emptyCardState('c'), TODAY)).toBe(true);
  });

  it('compare des jours locaux', () => {
    expect(isDue(reviewing(3, EASE_START, '2026-09-09'), TODAY)).toBe(true);
    expect(isDue(reviewing(3, EASE_START, '2026-09-08'), TODAY)).toBe(true);
    expect(isDue(reviewing(3, EASE_START, '2026-09-10'), TODAY)).toBe(false);
  });
});

describe('reviewCard — apprentissage', () => {
  it('« Encore » sur une carte nouvelle la repose aujourd’hui', () => {
    const c = reviewCard(undefined, 'c', 'again', TODAY, NOW);
    expect(c).toMatchObject({ id: 'c', phase: 'learning', intervalDays: 0, due: TODAY, reps: 1 });
    expect(c.lastReviewedAt).toBe(NOW);
    expect(c.lapses).toBe(0);
  });

  it('« Difficile » en apprentissage repose aussi aujourd’hui', () => {
    const c = reviewCard(undefined, 'c', 'hard', TODAY, NOW);
    expect(c).toMatchObject({ phase: 'learning', intervalDays: 0, due: TODAY });
  });

  it('un premier « Bien » envoie à demain, un second fait sortir à 3 jours', () => {
    const first = reviewCard(undefined, 'c', 'good', TODAY, NOW);
    expect(first).toMatchObject({ phase: 'learning', intervalDays: 1, due: '2026-09-10' });
    const second = reviewCard(first, 'c', 'good', '2026-09-10', NOW);
    expect(second).toMatchObject({ phase: 'review', intervalDays: 3, due: '2026-09-13' });
    expect(second.ease).toBe(EASE_START);
  });

  it('« Facile » fait sortir tout de suite à 4 jours et gonfle la facilité', () => {
    const c = reviewCard(undefined, 'c', 'easy', TODAY, NOW);
    expect(c).toMatchObject({ phase: 'review', intervalDays: 4, due: '2026-09-13' });
    expect(c.ease).toBe(EASE_START + 150);
  });
});

describe('reviewCard — révision', () => {
  it('« Encore » est une rechute : retour en apprentissage, facilité −20 %', () => {
    const c = reviewCard(reviewing(10), 'c', 'again', TODAY, NOW);
    expect(c).toMatchObject({ phase: 'learning', intervalDays: 0, due: TODAY, lapses: 1 });
    expect(c.ease).toBe(EASE_START - 200);
  });

  it('ne descend jamais la facilité sous le plancher', () => {
    const c = reviewCard(reviewing(10, EASE_MIN), 'c', 'again', TODAY, NOW);
    expect(c.ease).toBe(EASE_MIN);
    const h = reviewCard(reviewing(10, EASE_MIN + 50), 'c', 'hard', TODAY, NOW);
    expect(h.ease).toBe(EASE_MIN);
  });

  it('« Difficile » allonge de 20 % et baisse la facilité de 15 %', () => {
    const c = reviewCard(reviewing(10), 'c', 'hard', TODAY, NOW);
    expect(c).toMatchObject({ phase: 'review', intervalDays: 12, due: '2026-09-21' });
    expect(c.ease).toBe(EASE_START - 150);
  });

  it('« Difficile » garde au moins 1 jour d’intervalle', () => {
    const c = reviewCard(reviewing(1), 'c', 'hard', TODAY, NOW);
    expect(c.intervalDays).toBe(1);
  });

  it('« Bien » multiplie par la facilité', () => {
    const c = reviewCard(reviewing(10), 'c', 'good', TODAY, NOW);
    expect(c.intervalDays).toBe(25);
    expect(c.due).toBe('2026-10-04');
    expect(c.ease).toBe(EASE_START);
  });

  it('« Facile » multiplie par la facilité et 1,3, et gonfle la facilité', () => {
    const c = reviewCard(reviewing(10), 'c', 'easy', TODAY, NOW);
    expect(c.intervalDays).toBe(33);
    expect(c.ease).toBe(EASE_START + 150);
  });

  it('plafonne l’intervalle à un an', () => {
    const c = reviewCard(reviewing(300), 'c', 'easy', TODAY, NOW);
    expect(c.intervalDays).toBe(MAX_INTERVAL);
  });

  it('ne mute pas l’entrée', () => {
    const before = reviewing(10);
    const snapshot = JSON.stringify(before);
    reviewCard(before, 'c', 'good', TODAY, NOW);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('previewIntervals', () => {
  it('donne l’intervalle de chaque bouton', () => {
    expect(previewIntervals(undefined, 'c', TODAY)).toEqual({ again: 0, hard: 0, good: 1, easy: 4 });
    expect(previewIntervals(reviewing(10), 'c', TODAY)).toEqual({
      again: 0,
      hard: 12,
      good: 25,
      easy: 33,
    });
  });
});

describe('deckStats', () => {
  it('compte par phase et les dues du jour', () => {
    const cards: Record<string, CardState> = {
      a: reviewing(3, EASE_START, '2026-09-08'),
      b: reviewing(3, EASE_START, '2026-09-20'),
      c: { ...emptyCardState('c'), phase: 'learning', due: TODAY },
      d: emptyCardState('d'),
    };
    expect(deckStats(cards, ['a', 'b', 'c', 'd', 'e'], TODAY)).toEqual({
      total: 5,
      new: 2,
      learning: 1,
      review: 2,
      dueToday: 2,
    });
  });
});

describe('composeDeckSession', () => {
  const cards: Record<string, CardState> = {
    late: { ...reviewing(3, EASE_START, '2026-09-01'), id: 'late' },
    today: { ...reviewing(3, EASE_START, TODAY), id: 'today' },
    future: { ...reviewing(3, EASE_START, '2026-09-20'), id: 'future' },
    sameDay: { ...reviewing(3, EASE_START, '2026-09-01'), id: 'sameDay' },
  };
  const ids = ['n1', 'today', 'n2', 'future', 'late', 'n3', 'sameDay'];

  it('met les dues en premier, les plus en retard d’abord, puis des nouvelles', () => {
    const out = composeDeckSession(cards, ids, TODAY, rngZero);
    expect(out.slice(0, 3)).toEqual(['late', 'sameDay', 'today']);
    expect(out).not.toContain('future');
    expect(out.slice(3).sort()).toEqual(['n1', 'n2', 'n3']);
  });

  it('respecte la limite de nouvelles cartes', () => {
    const out = composeDeckSession(cards, ids, TODAY, mulberry32(1), { limit: 20, newLimit: 1 });
    expect(out).toHaveLength(4);
  });

  it('respecte la limite totale, dues en priorité', () => {
    const out = composeDeckSession(cards, ids, TODAY, mulberry32(1), { limit: 2, newLimit: 8 });
    expect(out).toEqual(['late', 'sameDay']);
  });

  it('ne complète pas avec des cartes non dues', () => {
    const out = composeDeckSession({ future: cards.future }, ['future'], TODAY, rngZero);
    expect(out).toEqual([]);
  });

  it('tire les nouvelles au hasard de façon reproductible', () => {
    const a = composeDeckSession({}, ['a', 'b', 'c', 'd'], TODAY, mulberry32(3), { limit: 2, newLimit: 2 });
    const b = composeDeckSession({}, ['a', 'b', 'c', 'd'], TODAY, mulberry32(3), { limit: 2, newLimit: 2 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(2);
  });

  it('a des valeurs par défaut raisonnables', () => {
    expect(DEFAULT_DECK_SESSION).toEqual({ limit: 20, newLimit: 8 });
  });
});

describe('gradeIsCorrect', () => {
  it('ne compte « Encore » que comme une erreur', () => {
    expect(gradeIsCorrect('again')).toBe(false);
    expect(gradeIsCorrect('hard')).toBe(true);
    expect(gradeIsCorrect('good')).toBe(true);
    expect(gradeIsCorrect('easy')).toBe(true);
  });
});
