/**
 * Les unités ajoutées après coup, rédigées au format JSON (en anglais)
 * (src/data/units.extra.json, produit par tools/integrate_units.py). Ici :
 * la conversion vers les types de l'app.
 */

import codeExtra from '@/data/code.extra.json';
import unitsExtra from '@/data/units.extra.json';
import type { CodeBlock, Exercise } from '@/game';
import { translate } from '@/i18n/translate';

import type { Card, Unit } from './types';

type L = string;

interface ExtraCard {
  id: string;
  subject: string;
  topic: string;
  level: Card['level'];
  term: L;
  definition: L;
  example: L;
  alts?: L[];
}

type ExtraExercise =
  | { key: string; unitId: string; kind: 'qcm'; prompt: L; choices: L[]; answer: number; explain: L; code?: { lang: string; src: string }; whyWrong?: (L | null)[]; output?: string; priority?: boolean; variants?: { prompt: L; choices: L[]; answer: number; explain?: L }[] }
  | { key: string; unitId: string; kind: 'vf'; prompt: L; isTrue: boolean; explain: L; priority?: boolean; variants?: { prompt: L; isTrue: boolean; explain?: L }[] }
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

export function extraUnits(): Unit[] {
  return EXTRA_UNITS.map((u) => ({
    id: u.unit.id,
    subjectId: u.unit.subjectId,
    title: u.unit.title,
    description: u.unit.description,
    cards: [...u.unit.cardIds],
  }));
}

export function extraCards(): Card[] {
  return EXTRA_UNITS.flatMap((u) =>
    u.cards.map((c) => ({
      id: c.id,
      subject: c.subject,
      topic: c.topic,
      level: c.level,
      term: c.term,
      definition: c.definition,
      example: c.example,
      ...(c.alts && c.alts.length > 0 ? { alts: [...c.alts] } : {}),
      tags: ['#manual'],
    })),
  );
}

export function extraExercises(): Exercise[] {
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
            prompt: e.prompt,
            choices: [...e.choices],
            answer: e.answer,
            explain: e.explain,
            ...(e.code ? { code: { lang: e.code.lang as CodeBlock['lang'], src: e.code.src } } : {}),
            ...(e.whyWrong ? { whyWrong: e.whyWrong.map((w) => (w ?? null)) } : {}),
            ...(e.output !== undefined ? { output: e.output } : {}),
            ...(e.variants && e.variants.length > 0 ? { variants: e.variants.map((v) => ({ prompt: v.prompt, choices: [...v.choices], answer: v.answer, ...(v.explain ? { explain: v.explain } : {}) })) } : {}),
            ...priority,
          });
          break;
        case 'vf': {
          const tf = [translate('en', 'common.true'), translate('en', 'common.false')];
          out.push({
            kind: 'qcm',
            key: e.key,
            unitId: e.unitId,
            prompt: e.prompt,
            choices: tf,
            answer: e.isTrue ? 0 : 1,
            explain: e.explain,
            ...(e.variants && e.variants.length > 0 ? { variants: e.variants.map((v) => ({ prompt: v.prompt, choices: [...tf], answer: v.isTrue ? 0 : 1, ...(v.explain ? { explain: v.explain } : {}) })) } : {}),
            ...priority,
          });
          break;
        }
        case 'bugline':
          out.push({ kind: 'bugline', key: e.key, unitId: e.unitId, prompt: e.prompt, lang: e.lang as CodeBlock['lang'], lines: [...e.lines], answer: e.answer, explain: e.explain, ...priority });
          break;
        case 'compose':
          out.push({ kind: 'compose', key: e.key, unitId: e.unitId, prompt: e.prompt, lang: e.lang as CodeBlock['lang'], tokens: [...e.tokens], extra: [...e.extra], explain: e.explain, ...priority });
          break;
        case 'order':
          out.push({ kind: 'order', key: e.key, unitId: e.unitId, prompt: e.prompt, steps: [...e.steps], explain: e.explain });
          break;
        case 'case':
          out.push({
            kind: 'case',
            key: e.key,
            unitId: e.unitId,
            title: e.title,
            scenario: e.scenario,
            steps: e.steps.map((s) => ({ prompt: s.prompt, choices: [...s.choices], answer: s.answer, feedback: s.feedback })),
            explain: e.explain,
          });
          break;
      }
    }
  }
  return out;
}
