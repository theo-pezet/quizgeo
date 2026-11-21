/**
 * « Ask Claude » : après une réponse, ouvrir Claude avec la question, la
 * réponse donnée, la bonne réponse et l'explication de l'app déjà écrites,
 * pour demander une explication sans copier-coller.
 *
 * Le message passe par l'URL https://claude.ai/new?q=… (champ pré-rempli,
 * l'apprenant n'a plus qu'à envoyer). Sur Android, le lien ouvre l'app Claude
 * si elle est installée, sinon le navigateur. Fonctions pures : testées dans
 * __tests__/askClaude.test.ts.
 */

import type { Exercise } from '@/game';

/** Au-delà, on tronque le code et les explications : l'URL doit rester raisonnable. */
const MAX_PROMPT = 3500;
const MAX_BLOCK = 900;

export interface AskContext {
  exercise: Exercise;
  /** Titre de l'unité (« CSS: the basics »), pour situer la question. */
  unitTitle?: string;
  correct: boolean;
  /** Ce que l'apprenant a répondu, quand l'exercice sait le dire. */
  given?: string;
  /** Pourquoi le choix donné est faux, quand le contenu le dit. */
  whyWrong?: string;
  /** Langue de l'apprenant (« fr-FR ») : Claude répondra dans cette langue. */
  locale?: string;
}

function clip(text: string, max = MAX_BLOCK): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** L'énoncé et la bonne réponse, selon le type d'exercice. */
export function describe(e: Exercise): { question: string[]; answer: string } {
  switch (e.kind) {
    case 'qcm': {
      const q = [`Question: ${e.prompt}`];
      if (e.code) q.push(`Code (${e.code.lang}):\n${clip(e.code.src)}`);
      q.push(`Choices:\n${e.choices.map((c) => `- ${c}`).join('\n')}`);
      return { question: q, answer: e.choices[e.answer] };
    }
    case 'cloze':
      return { question: [`Fill in the blank: ${e.text}`, `Options: ${[e.answer, ...e.bank].join(' / ')}`], answer: e.answer };
    case 'match':
      return {
        question: [`Match each item with its pair${e.prompt ? ` (${e.prompt})` : ''}.`],
        answer: e.pairs.map((p) => `${p.left} = ${p.right}`).join('\n'),
      };
    case 'order':
      return { question: [`Put in order: ${e.prompt}`], answer: e.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') };
    case 'case':
      return {
        question: [`Case study: ${e.title}`, clip(e.scenario), ...e.steps.map((s, i) => `Decision ${i + 1}: ${s.prompt}`)],
        answer: e.steps.map((s, i) => `Decision ${i + 1}: ${s.choices[s.answer]}`).join('\n'),
      };
    case 'bugline':
      return {
        question: [`Question: ${e.prompt}`, `Code (${e.lang}):\n${clip(e.lines.map((l, i) => `${i + 1}  ${l}`).join('\n'))}`],
        answer: `line ${e.answer + 1}: ${e.lines[e.answer].trim()}`,
      };
    case 'compose':
      return { question: [`Build this line of ${e.lang}: ${e.prompt}`], answer: e.tokens.join(' ') };
  }
}

/** Le message pour Claude. */
export function buildAskPrompt(ctx: AskContext): string {
  const { question, answer } = describe(ctx.exercise);
  const lines: string[] = [
    ctx.correct
      ? 'I am learning with a quiz app. I got this question right, but I am not sure I really understand why.'
      : 'I am learning with a quiz app and I got this question wrong. I do not understand the answer.',
    'I am a beginner: explain simply, step by step, with a small concrete example' + (ctx.correct ? '.' : ', and tell me exactly where my reasoning went wrong.'),
    '',
  ];
  if (ctx.unitTitle) lines.push(`Lesson: ${ctx.unitTitle}`);
  lines.push(...question);
  if (ctx.given) lines.push(`My answer: ${ctx.given}${ctx.correct ? '' : ' (wrong)'}`);
  lines.push(`Correct answer: ${answer}`);
  if (ctx.whyWrong) lines.push(`The app says my answer is wrong because: ${clip(ctx.whyWrong)}`);
  if (ctx.exercise.explain) lines.push(`The app's explanation: ${clip(ctx.exercise.explain)}`);
  if (ctx.locale) lines.push('', `Please reply in the language of the "${ctx.locale}" locale, and keep the technical terms in English.`);
  return clip(lines.join('\n'), MAX_PROMPT);
}

/** Lien qui ouvre une nouvelle conversation Claude avec le message pré-rempli. */
export function claudeUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** La langue de l'appareil (« fr-FR »), ou undefined si l'environnement ne la donne pas. */
export function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || undefined;
  } catch {
    return undefined;
  }
}
