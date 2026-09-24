import { answerMatches, editDistance, hasOperators, normalizeAnswer } from '../text';

describe('normalizeAnswer', () => {
  it('ignore casse, accents, ponctuation, parenthèses et espaces', () => {
    expect(normalizeAnswer('  Fenêtre de contexte ')).toBe('fenetre de contexte');
    expect(normalizeAnswer('Domain Rating (DR)')).toBe('domain rating');
    expect(normalizeAnswer('A/B Testing!')).toBe('a b testing');
  });
});

describe('editDistance', () => {
  it('compte les modifications', () => {
    expect(editDistance('seo', 'seo')).toBe(0);
    expect(editDistance('seo', 'sea')).toBe(1);
    expect(editDistance('backlink', 'baclink')).toBe(1);
    expect(editDistance('abc', 'xyz')).toBe(3);
  });
});

describe('answerMatches', () => {
  it('accepte l’exact, les variantes, et une faute sur un mot long', () => {
    expect(answerMatches('backlink', 'Backlink')).toBe(true);
    expect(answerMatches('backlinc', 'Backlink')).toBe(true);
    expect(answerMatches('fenetre de contexe', 'Fenêtre de contexte')).toBe(true);
    expect(answerMatches('ctr', 'CTR')).toBe(true);
    expect(answerMatches('taux de clic', 'CTR', ['taux de clic'])).toBe(true);
  });

  it('refuse le vide, une faute sur un mot court, et un autre mot', () => {
    expect(answerMatches('', 'SEO')).toBe(false);
    expect(answerMatches('sea', 'SEO')).toBe(false);
    expect(answerMatches('maillage', 'Backlink')).toBe(false);
  });
});

describe('opérateurs dans la réponse attendue', () => {
  it('repère les expressions, pas les mots composés', () => {
    expect(hasOperators('x + y')).toBe(true);
    expect(hasOperators('x // y')).toBe(true);
    expect(hasOperators('a != b')).toBe(true);
    expect(hasOperators('A/B Testing')).toBe(false);
    expect(hasOperators('E-E-A-T')).toBe(false);
    expect(hasOperators('Click-Through Rate')).toBe(false);
  });

  it('garde les opérateurs quand on le demande', () => {
    expect(normalizeAnswer('x+y', true)).toBe('x + y');
    expect(normalizeAnswer('X  //  Y', true)).toBe('x // y');
  });

  it('refuse un autre opérateur, accepte les variantes d’espacement', () => {
    const ops = ['x + y', 'x - y', 'x * y', 'x / y', 'x // y', 'x % y'];
    for (const expected of ops) {
      for (const typed of ops) expect(answerMatches(typed, expected)).toBe(typed === expected);
    }
    expect(answerMatches('x+y', 'x + y')).toBe(true);
    expect(answerMatches('X // Y', 'x // y')).toBe(true);
    expect(answerMatches('x y', 'x + y')).toBe(false);
  });

  it('accepte le sigle et le terme anglais fournis en variantes', () => {
    expect(answerMatches('DCO', 'Dynamic Creative Optimization (DCO)', ['Dynamic Creative Optimization', 'DCO'])).toBe(true);
    expect(answerMatches('reach', 'Portée', ['Reach'])).toBe(true);
  });
});
