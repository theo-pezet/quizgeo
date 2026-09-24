/**
 * Qualité des exercices écrits à la main (clés `:x:`, `:w:`, `:c:`), dans les
 * trois langues :
 * - la bonne réponse ne doit pas se deviner à sa longueur : dans un QCM (hors
 *   vrai/faux) comme dans chaque étape de cas pratique, elle ne dépasse jamais
 *   1,6 fois le plus long des distracteurs ;
 * - aucun texte affiché ne garde de Markdown brut (`code`) : l'app l'affiche
 *   dans un simple Text, on écrit « code » (fr), “code” (en), «code» (es) ;
 * - pas de « ... » à la place de « … », sauf dans du code cité (spread
 *   « [...arr] », « f(...) », « 0x... ») ;
 * - pas de tiret cadratin.
 */

import { contentFor } from '..';
import type { Exercise } from '@/game';
import type { Lang } from '@/i18n/translate';

const LANGS: Lang[] = ['fr', 'en', 'es'];
const MAX_RATIO = 1.6;

const HANDWRITTEN = /:(x|w|c):/;
const BACKTICKS = /`[^`\n]+`/;
const DOTS = /\.\.\./;
/** « ... » légitime dans du code cité : spread, appel abrégé, adresse mémoire, valeur élidée. */
const CODE_DOTS = /\[\.\.\.|\(\.\.\.|\{\s*\.\.\.|\.\.\.[A-Za-z_[{(/]|,\s*\.\.\.|[=:]\s*\.\.\.|\.\.\.\s*[\]}),>]|0x\.\.\./;

/** Les questions à choix d'un exercice : le QCM lui-même ou chaque étape du cas. */
function questions(e: Exercise): { id: string; choices: string[]; answer: number }[] {
  if (e.kind === 'qcm') return e.choices.length >= 3 ? [{ id: e.key, choices: e.choices, answer: e.answer }] : [];
  if (e.kind === 'case') return e.steps.map((s, i) => ({ id: `${e.key}#${i}`, choices: s.choices, answer: s.answer }));
  return [];
}

/** Les textes affichés (hors blocs de code, lignes de code et jetons de code). */
function displayedTexts(e: Exercise): string[] {
  const out: (string | null | undefined)[] = [e.explain];
  switch (e.kind) {
    case 'qcm':
      out.push(e.prompt, ...e.choices, ...(e.whyWrong ?? []));
      break;
    case 'case':
      out.push(e.title, e.scenario);
      for (const s of e.steps) out.push(s.prompt, s.feedback, ...s.choices);
      break;
    case 'order':
      out.push(e.prompt, ...e.steps);
      break;
    case 'match':
      out.push(e.prompt);
      for (const p of e.pairs) out.push(p.left, p.right);
      break;
    case 'cloze':
      out.push(e.text);
      break;
    case 'bugline':
    case 'compose':
      out.push(e.prompt);
      break;
  }
  return out.filter((t): t is string => typeof t === 'string');
}

describe.each(LANGS)('les exercices écrits à la main en %s', (lang) => {
  const exercises = contentFor(lang).EXERCISES.filter((e) => HANDWRITTEN.test(e.key));

  it('existent', () => {
    expect(exercises.length).toBeGreaterThan(500);
  });

  it('ne trahissent pas la bonne réponse par sa longueur', () => {
    const tooLong: string[] = [];
    for (const e of exercises) {
      for (const q of questions(e)) {
        const right = q.choices[q.answer].length;
        const longestWrong = Math.max(...q.choices.filter((_, i) => i !== q.answer).map((c) => c.length));
        if (right > MAX_RATIO * longestWrong) tooLong.push(`${q.id} (${right} contre ${longestWrong})`);
      }
    }
    expect(tooLong).toEqual([]);
  });

  it('n’affichent ni backticks, ni « ... », ni tiret cadratin', () => {
    const bad: string[] = [];
    for (const e of exercises) {
      for (const t of displayedTexts(e)) {
        if (BACKTICKS.test(t)) bad.push(`${e.key} backticks : ${t}`);
        if (DOTS.test(t) && !CODE_DOTS.test(t)) bad.push(`${e.key} « ... » : ${t}`);
        if (t.includes('—')) bad.push(`${e.key} tiret cadratin : ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
