import { applyCardReview } from '../apply';
import { CARD_FACES, LEECH_LAPSES, MIN_REPS_BEFORE_VARYING, pickCardFace, type FaceAvailability } from '../faces';
import { emptyCardState } from '../srs';
import { emptyProgress, type CardFace, type CardState } from '../types';

const ALL: FaceAvailability = { definition: true, example: true, cloze: true, duel: true };
const NONE: FaceAvailability = { definition: false, example: false, cloze: false, duel: false };
const seen = (over: Partial<CardState> = {}): CardState => ({ ...emptyCardState('c'), phase: 'review', reps: MIN_REPS_BEFORE_VARYING, ...over });
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickCardFace', () => {
  it('montre le terme tant que la carte est en découverte', () => {
    expect(pickCardFace(undefined, ALL, Math.random)).toBe('term');
    expect(pickCardFace(seen({ reps: MIN_REPS_BEFORE_VARYING - 1 }), ALL, Math.random)).toBe('term');
  });

  it('met une carte qui rechute en duel, une révision sur deux', () => {
    const leech = seen({ lapses: LEECH_LAPSES });
    expect(pickCardFace(leech, ALL, () => 0.99)).toBe('duel');
    expect(pickCardFace({ ...leech, lastFace: 'duel' }, ALL, () => 0)).not.toBe('duel');
    expect(pickCardFace(leech, { ...ALL, duel: false }, () => 0)).not.toBe('duel');
    expect(pickCardFace(seen({ lapses: LEECH_LAPSES - 1 }), ALL, () => 0.999)).not.toBe('duel');
  });

  it('ne repasse jamais par le visage précédent et ne propose que ce que la carte permet', () => {
    for (const last of ['term', 'definition', 'example', 'cloze'] as CardFace[]) {
      for (let r = 0; r < 1; r += 0.05) {
        const f = pickCardFace(seen({ lastFace: last }), ALL, () => r);
        expect(f).not.toBe(last);
        expect(f).not.toBe('duel');
      }
    }
    expect(pickCardFace(seen({ lastFace: 'term' }), { ...NONE, definition: true }, () => 0.5)).toBe('definition');
  });

  it('retombe sur le terme quand la carte n’a rien d’autre', () => {
    expect(pickCardFace(seen({ lastFace: 'term' }), NONE, Math.random)).toBe('term');
  });

  it('pèse double les visages de production', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 700; i += 1) {
      const f = pickCardFace(seen(), ALL, seq((i + 0.5) / 700));
      counts[f] = (counts[f] ?? 0) + 1;
    }
    expect(counts).toEqual({ term: 100, definition: 200, example: 200, cloze: 200 });
    expect(pickCardFace(seen(), ALL, () => 0.9999999)).toBe('cloze');
    expect(pickCardFace(seen(), ALL, () => 1)).toBe('cloze');
  });

  it('connaît les cinq visages', () => {
    expect(CARD_FACES).toEqual(['term', 'definition', 'example', 'cloze', 'duel']);
  });
});

describe('applyCardReview et le visage', () => {
  const now = new Date('2026-11-13T10:00:00Z');
  it('retient le visage montré, et garde l’ancien sans visage', () => {
    const p = applyCardReview(emptyProgress(), { cardId: 'c', grade: 'good', now, face: 'example' }).progress;
    expect(p.cards.c.lastFace).toBe('example');
    const q = applyCardReview(p, { cardId: 'c', grade: 'good', now }).progress;
    expect(q.cards.c.lastFace).toBe('example');
  });
});
