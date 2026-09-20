/**
 * Les unités ajoutées après coup, rédigées au format JSON en trois langues
 * (src/data/units.extra.json, produit par tools/integrate_units.py). Ici :
 * la conversion vers les types de l'app, pour une langue donnée.
 */

import codeExtra from '@/data/code.extra.json';
import unitsExtra from '@/data/units.extra.json';
import type { CodeBlock, Exercise } from '@/game';
import { translate, type Lang } from '@/i18n/translate';

import type { Card, Unit } from './types';

type L = Record<Lang, string>;

interface ExtraCard {
  id: string;
  subject: string;
  topic: string;
  level: Card['level'];
  term: L;
  definition: L;
  example: L;
}

type ExtraExercise =
  | { key: string; unitId: string; kind: 'qcm'; prompt: L; choices: L[]; answer: number; explain: L; code?: { lang: string; src: string }; whyWrong?: (L | null)[]; output?: string; priority?: boolean }
  | { key: string; unitId: string; kind: 'vf'; prompt: L; isTrue: boolean; explain: L; priority?: boolean }
  | { key: string; unitId: string; kind: 'bugline'; prompt: L; lang: string; lines: string[]; answer: number; explain: L; priority?: boolean }
  | { key: string; unitId: string; kind: 'compose'; prompt: L; lang: string; tokens: string[]; extra: string[]; explain: L; priority?: boolean }
  | { key: string; unitId: string; kind: 'order'; prompt: L; steps: L[]; explain: L; priority?: boolean }
  | { key: string; unitId: string; kind: 'case'; title: L; scenario: L; steps: { prompt: L; choices: L[]; answer: number; feedback: L }[]; explain: L; priority?: boolean };

interface ExtraUnit {
  unit: { id: string; subjectId: string; topic: string; world: string; title: L; description: L; cardIds: string[] };
  cards: ExtraCard[];
  exercises: ExtraExercise[];
}

export const EXTRA_UNITS: readonly ExtraUnit[] = (unitsExtra as { units: ExtraUnit[] }).units;

/**
 * Les exercices « lis le code » rattachés aux unités existantes
 * (src/data/code.extra.json, produit par tools/integrate_code.py). Prioritaires
 * dans les leçons : voir composeUnitSession.
 */
export const CODE_EXERCISES: readonly ExtraExercise[] = (codeExtra as { exercises: ExtraExercise[] }).exercises;

/** Identifiant → monde d'accueil, pour worlds.ts. */
export const EXTRA_UNIT_WORLDS: readonly { id: string; subjectId: string; world: string }[] = EXTRA_UNITS.map((u) => ({
  id: u.unit.id,
  subjectId: u.unit.subjectId,
  world: u.unit.world,
}));

export function extraUnits(lang: Lang): Unit[] {
  return EXTRA_UNITS.map((u) => ({
    id: u.unit.id,
    subjectId: u.unit.subjectId,
    title: u.unit.title[lang],
    description: u.unit.description[lang],
    cards: [...u.unit.cardIds],
  }));
}

export function extraCards(lang: Lang): Card[] {
  return EXTRA_UNITS.flatMap((u) =>
    u.cards.map((c) => ({
      id: c.id,
      subject: c.subject,
      topic: c.topic,
      level: c.level,
      term: c.term[lang],
      definition: c.definition[lang],
      example: c.example[lang],
      tags: ['#manual'],
    })),
  );
}

export function extraExercises(lang: Lang): Exercise[] {
  const out: Exercise[] = [];
  const all: ExtraExercise[] = [...EXTRA_UNITS.flatMap((u) => u.exercises), ...CODE_EXERCISES];
  for (const e of all) {
    {
      const priority = e.priority ? { priority: true } : {};
      switch (e.kind) {
        case 'qcm':
          out.push({
            kind: 'qcm',
            key: e.key,
            unitId: e.unitId,
            prompt: e.prompt[lang],
            choices: e.choices.map((c) => c[lang]),
            answer: e.answer,
            explain: e.explain[lang],
            ...(e.code ? { code: { lang: e.code.lang as CodeBlock['lang'], src: e.code.src } } : {}),
            ...(e.whyWrong ? { whyWrong: e.whyWrong.map((w) => (w ? w[lang] : null)) } : {}),
            ...(e.output !== undefined ? { output: e.output } : {}),
            ...priority,
          });
          break;
        case 'vf':
          out.push({ kind: 'qcm', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], choices: [translate(lang, 'common.true'), translate(lang, 'common.false')], answer: e.isTrue ? 0 : 1, explain: e.explain[lang], ...priority });
          break;
        case 'bugline':
          out.push({ kind: 'bugline', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], lang: e.lang as CodeBlock['lang'], lines: [...e.lines], answer: e.answer, explain: e.explain[lang], ...priority });
          break;
        case 'compose':
          out.push({ kind: 'compose', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], lang: e.lang as CodeBlock['lang'], tokens: [...e.tokens], extra: [...e.extra], explain: e.explain[lang], ...priority });
          break;
        case 'order':
          out.push({ kind: 'order', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], steps: e.steps.map((s) => s[lang]), explain: e.explain[lang] });
          break;
        case 'case':
          out.push({
            kind: 'case',
            key: e.key,
            unitId: e.unitId,
            title: e.title[lang],
            scenario: e.scenario[lang],
            steps: e.steps.map((s) => ({ prompt: s.prompt[lang], choices: s.choices.map((c) => c[lang]), answer: s.answer, feedback: s.feedback[lang] })),
            explain: e.explain[lang],
          });
          break;
      }
    }
  }
  return out;
}
