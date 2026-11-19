import type { Exercise } from '@/game';

import { buildAskPrompt, claudeUrl } from '../askClaude';

const qcm: Exercise = {
  kind: 'qcm',
  key: 'web-3:x:1',
  unitId: 'web-3',
  prompt: 'Which unit adapts to the parent font size?',
  choices: ['em', 'px', 'cm'],
  answer: 0,
  explain: 'em is relative to the parent font.',
  code: { lang: 'css', src: 'p { font-size: 2em; }' },
};

describe('Ask Claude', () => {
  it('écrit la question, les choix, la réponse donnée, la bonne réponse et les explications', () => {
    const p = buildAskPrompt({ exercise: qcm, unitTitle: 'CSS: the basics', correct: false, given: 'px', whyWrong: 'px is absolute.', locale: 'fr-FR' });
    expect(p).toContain('got this question wrong');
    expect(p).toContain('Lesson: CSS: the basics');
    expect(p).toContain('Question: Which unit adapts to the parent font size?');
    expect(p).toContain('p { font-size: 2em; }');
    expect(p).toContain('- cm');
    expect(p).toContain('My answer: px (wrong)');
    expect(p).toContain('Correct answer: em');
    expect(p).toContain('px is absolute.');
    expect(p).toContain("The app's explanation: em is relative to the parent font.");
    expect(p).toContain('"fr-FR"');
  });

  it('adapte le message à une bonne réponse', () => {
    const p = buildAskPrompt({ exercise: qcm, correct: true, given: 'em' });
    expect(p).toContain('got this question right');
    expect(p).toContain('My answer: em\n');
    expect(p).not.toContain('Lesson:');
    expect(p).not.toContain('locale');
  });

  it('sait décrire chaque type d’exercice', () => {
    const base = { key: 'k', unitId: 'u' };
    const all: Exercise[] = [
      { ...base, kind: 'cloze', text: 'A ___ B', answer: 'x', bank: ['y'] },
      { ...base, kind: 'match', prompt: 'Terms', pairs: [{ left: 'a', right: 'b' }] },
      { ...base, kind: 'match', pairs: [{ left: 'a', right: 'b' }] },
      { ...base, kind: 'order', prompt: 'Steps', steps: ['one', 'two', 'three'] },
      { ...base, kind: 'case', title: 'T', scenario: 'S', steps: [{ prompt: 'P', choices: ['c1', 'c2'], answer: 1, feedback: 'f' }] },
      { ...base, kind: 'bugline', prompt: 'Which line?', lang: 'js', lines: ['let a = 1', '  consol.log(a)'], answer: 1 },
      { ...base, kind: 'compose', prompt: 'Print 3', lang: 'js', tokens: ['console.log(', '3', ')'], extra: [] },
    ];
    const answers = ['Correct answer: x', 'Correct answer: a = b', 'Correct answer: a = b', '1. one\n2. two', 'Decision 1: c2', 'line 2: consol.log(a)', 'console.log( 3 )'];
    all.forEach((e, i) => expect(buildAskPrompt({ exercise: e, correct: false })).toContain(answers[i]));
  });

  it('tronque les textes trop longs', () => {
    const long = { ...qcm, code: { lang: 'css' as const, src: 'a'.repeat(5000) }, explain: 'b'.repeat(5000) };
    const p = buildAskPrompt({ exercise: long, correct: false });
    expect(p.length).toBeLessThanOrEqual(3500);
    expect(p).toContain('…');
  });

  it('encode le message dans un lien claude.ai', () => {
    expect(claudeUrl('a b&c')).toBe('https://claude.ai/new?q=a%20b%26c');
  });
});
