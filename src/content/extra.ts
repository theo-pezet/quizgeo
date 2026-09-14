/**
 * Les unités ajoutées après coup, rédigées au format JSON en trois langues
 * (src/data/units.extra.json, produit par tools/integrate_units.py). Ici :
 * la conversion vers les types de l'app, pour une langue donnée.
 */

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
  | { key: string; unitId: string; kind: 'qcm'; prompt: L; choices: L[]; answer: number; explain: L; code?: { lang: string; src: string } }
  | { key: string; unitId: string; kind: 'vf'; prompt: L; isTrue: boolean; explain: L }
  | { key: string; unitId: string; kind: 'order'; prompt: L; steps: L[]; explain: L }
  | { key: string; unitId: string; kind: 'case'; title: L; scenario: L; steps: { prompt: L; choices: L[]; answer: number; feedback: L }[]; explain: L };

interface ExtraUnit {
  unit: { id: string; subjectId: string; topic: string; world: string; title: L; description: L; cardIds: string[] };
  cards: ExtraCard[];
  exercises: ExtraExercise[];
}

export const EXTRA_UNITS: readonly ExtraUnit[] = (unitsExtra as { units: ExtraUnit[] }).units;

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
  for (const u of EXTRA_UNITS) {
    for (const e of u.exercises) {
      switch (e.kind) {
        case 'qcm':
          out.push({ kind: 'qcm', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], choices: e.choices.map((c) => c[lang]), answer: e.answer, explain: e.explain[lang], ...(e.code ? { code: { lang: e.code.lang as CodeBlock['lang'], src: e.code.src } } : {}) });
          break;
        case 'vf':
          out.push({ kind: 'qcm', key: e.key, unitId: e.unitId, prompt: e.prompt[lang], choices: [translate(lang, 'common.true'), translate(lang, 'common.false')], answer: e.isTrue ? 0 : 1, explain: e.explain[lang] });
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
