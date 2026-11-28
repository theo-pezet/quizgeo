import { formCount, presentVariant, type VariantTexts } from '../variants';
import { emptyQuestionProgress, type Exercise, type QcmExercise, type QuestionProgress } from '../types';

const texts: VariantTexts = {
  right: 'Right',
  wrong: 'Wrong',
  proposed: (prompt, answer) => `${prompt} | ${answer}`,
  correctIs: (answer) => `Answer: ${answer}.`,
};

const q: QcmExercise = {
  kind: 'qcm',
  key: 'u:x:1',
  unitId: 'u',
  cardId: 'c0',
  prompt: 'Which P covers SEO?',
  choices: ['Promotion', 'Place', 'Price', 'Product'],
  answer: 0,
  explain: 'Promotion is communication.',
  whyWrong: [null, 'no', 'no', 'no'],
  choiceCards: ['c0', 'c1', 'c2', 'c3'],
  variants: [{ prompt: 'Google Ads belong to which P?', choices: ['Place', 'Promotion', 'Price'], answer: 1 }],
};

const seen = (n: number): QuestionProgress => ({ ...emptyQuestionProgress(q.key), seen: n });

describe('formes d’une question', () => {
  it('compte l’originale, les variantes et la vérification', () => {
    expect(formCount(q)).toBe(3);
    expect(formCount({ ...q, variants: undefined, choices: ['True', 'False'], answer: 0 })).toBe(1);
  });

  it('montre l’originale au premier passage et pour les autres exercices', () => {
    expect(presentVariant(q, undefined, () => 0, texts)).toBe(q);
    expect(presentVariant(q, seen(0), () => 0, texts)).toBe(q);
    expect(presentVariant(q, seen(3), () => 0, texts)).toBe(q);
    const order: Exercise = { kind: 'order', key: 'u:o', unitId: 'u', prompt: 'p', steps: ['a', 'b'] };
    expect(presentVariant(order, seen(1), () => 0, texts)).toBe(order);
  });

  it('pose la variante rédigée au deuxième passage', () => {
    const v = presentVariant(q, seen(1), () => 0, texts) as QcmExercise;
    expect(v).toEqual({ kind: 'qcm', key: q.key, unitId: 'u', cardId: 'c0', prompt: 'Google Ads belong to which P?', choices: ['Place', 'Promotion', 'Price'], answer: 1, explain: q.explain });
    const withOwn = presentVariant({ ...q, variants: [{ prompt: 'p2', choices: ['a', 'b', 'c'], answer: 0, explain: 'own', choiceCards: ['x', 'y', 'z'] }] }, seen(1), () => 0, texts) as QcmExercise;
    expect(withOwn.explain).toBe('own');
    expect(withOwn.choiceCards).toEqual(['x', 'y', 'z']);
  });

  it('propose la bonne réponse à vérifier', () => {
    const v = presentVariant(q, seen(2), () => 0.1, texts) as QcmExercise;
    expect(v.prompt).toBe('Which P covers SEO? | Promotion');
    expect(v.choices).toEqual(['Right', 'Wrong']);
    expect(v.answer).toBe(0);
    expect(v.explain).toBe(q.explain);
    expect(v.choiceCards).toEqual(['c0', 'c0']);
    expect(v.whyWrong).toBeUndefined();
  });

  it('ou un piège, avec la bonne réponse en tête de l’explication', () => {
    const rolls = [0.9, 0.99];
    const v = presentVariant(q, seen(2), () => rolls.shift() as number, texts) as QcmExercise;
    expect(v.prompt).toBe('Which P covers SEO? | Product');
    expect(v.answer).toBe(1);
    expect(v.explain).toBe('Answer: Promotion. Promotion is communication.');
    expect(v.choiceCards).toEqual(['c3', 'c0']);
    const bare = presentVariant({ ...q, variants: undefined, choiceCards: undefined, explain: undefined, answer: 2 }, seen(1), () => 0.6, texts) as QcmExercise;
    expect(bare.prompt).toBe('Which P covers SEO? | Place');
    expect(bare.explain).toBe('Answer: Price.');
    expect(bare.choiceCards).toBeUndefined();
  });
});
