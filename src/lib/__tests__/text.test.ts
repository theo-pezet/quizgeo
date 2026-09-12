import { answerMatches, editDistance, normalizeAnswer } from '../text';

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
