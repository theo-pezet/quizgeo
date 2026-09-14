/**
 * Point d'entrée du contenu. Le reste de l'app n'importe que d'ici.
 *
 * Le contenu dépend de la langue : `contentFor(lang)` (mémorisé) ou, dans un
 * composant, `useContent()`. La STRUCTURE (identifiants d'unités, catalogue,
 * mondes) ne dépend pas de la langue.
 */

import { catalogFrom, type Catalog, type Exercise } from '@/game';
import { translate, type Lang } from '@/i18n/translate';

import { extraUnits } from './extra';
import { generateExercises, resolveUnitCards, type GenTexts } from './generate';
import { localizedCards, localizedExtras } from './localize';
import { SUBJECTS as SUBJECTS_BASE } from './subjects';
import type { Card, Subject, Unit } from './types';
import { UNITS as UNITS_BASE } from './units';
import { UNIT_TEXT } from './units.i18n';
import { WORLDS } from './worlds';

export { WORLDS, WORLD_BY_UNIT, isWorldComplete, worldProgress, worldsOf, type World } from './worlds';
export type { Card, Subject, Unit } from './types';

/**
 * L'ordre du chemin : matière par matière, monde par monde, unité par unité.
 * Les unités écrites en TypeScript (units.ts) et celles rédigées en JSON
 * (units.extra.json) se rangent toutes derrière les mondes (worlds.ts).
 */
const STRUCTURE: readonly { id: string; subjectId: string }[] = SUBJECTS_BASE.flatMap((s) =>
  WORLDS.filter((w) => w.subjectId === s.id).flatMap((w) => w.unitIds.map((id) => ({ id, subjectId: s.id }))),
);

function orderUnits(units: readonly Unit[]): Unit[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  return STRUCTURE.map((s) => byId.get(s.id)).filter((u): u is Unit => u !== undefined);
}

/** Identifiants et matières des unités : la structure, indépendante de la langue. */
export const CATALOG: Catalog = catalogFrom(STRUCTURE);
export const UNIT_IDS: readonly string[] = STRUCTURE.map((u) => u.id);

export interface Content {
  lang: Lang;
  SUBJECTS: readonly Subject[];
  SUBJECT_BY_ID: ReadonlyMap<string, Subject>;
  UNITS: readonly Unit[];
  UNIT_BY_ID: ReadonlyMap<string, Unit>;
  CARDS: readonly Card[];
  CARD_BY_ID: ReadonlyMap<string, Card>;
  CARD_IDS: readonly string[];
  EXERCISES: readonly Exercise[];
  EXERCISE_BY_KEY: ReadonlyMap<string, Exercise>;
  cardsOf: (subject: string, topic?: string) => Card[];
  cardIdsOf: (subject: string) => string[];
  exercisesOfUnit: (unitId: string) => Exercise[];
  exercisesOfSubject: (subjectId: string) => Exercise[];
}

function build(lang: Lang): Content {
  const SUBJECTS: Subject[] = SUBJECTS_BASE.map((s) => ({
    ...s,
    title: translate(lang, `subject.${s.id}.title` as 'subject.marketing.title'),
    tagline: translate(lang, `subject.${s.id}.tagline` as 'subject.marketing.tagline'),
  }));
  const UNITS: Unit[] = orderUnits([...UNITS_BASE.map((u) => (lang === 'fr' ? u : { ...u, ...(UNIT_TEXT[lang][u.id] ?? {}) })), ...extraUnits(lang)]);
  const CARDS = localizedCards(lang);
  const texts: GenTexts = {
    whatMeans: (term) => translate(lang, 'gen.whatMeans', { term }),
    whichTerm: translate(lang, 'gen.whichTerm'),
    match: translate(lang, 'gen.match'),
    example: (text) => translate(lang, 'gen.example', { text }),
  };
  const cardsOf = (subject: string, topic?: string) => CARDS.filter((c) => c.subject === subject && (topic === undefined || c.topic === topic));
  const EXERCISES: Exercise[] = [];
  const bySubject = new Map<string, Card[]>();
  for (const unit of UNITS) {
    let subjectCards = bySubject.get(unit.subjectId);
    if (subjectCards === undefined) {
      subjectCards = cardsOf(unit.subjectId);
      bySubject.set(unit.subjectId, subjectCards);
    }
    EXERCISES.push(...generateExercises(unit, resolveUnitCards(unit, CARDS), subjectCards, texts));
  }
  EXERCISES.push(...localizedExtras(lang));
  const unitIdsOfSubject = new Map<string, Set<string>>();
  for (const s of SUBJECTS) unitIdsOfSubject.set(s.id, new Set(UNITS.filter((u) => u.subjectId === s.id).map((u) => u.id)));
  return {
    lang,
    SUBJECTS,
    SUBJECT_BY_ID: new Map(SUBJECTS.map((s) => [s.id, s])),
    UNITS,
    UNIT_BY_ID: new Map(UNITS.map((u) => [u.id, u])),
    CARDS,
    CARD_BY_ID: new Map(CARDS.map((c) => [c.id, c])),
    CARD_IDS: CARDS.map((c) => c.id),
    EXERCISES,
    EXERCISE_BY_KEY: new Map(EXERCISES.map((e) => [e.key, e])),
    cardsOf,
    cardIdsOf: (subject) => CARDS.filter((c) => c.subject === subject).map((c) => c.id),
    exercisesOfUnit: (unitId) => EXERCISES.filter((e) => e.unitId === unitId),
    exercisesOfSubject: (subjectId) => {
      const ids = unitIdsOfSubject.get(subjectId);
      return ids ? EXERCISES.filter((e) => ids.has(e.unitId)) : [];
    },
  };
}

const cache = new Map<Lang, Content>();

export function contentFor(lang: Lang): Content {
  let c = cache.get(lang);
  if (!c) {
    c = build(lang);
    cache.set(lang, c);
  }
  return c;
}
