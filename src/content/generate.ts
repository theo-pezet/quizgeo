/**
 * Génère les exercices d'une unité à partir de ses cartes du deck.
 *
 * Déterministe : la graine est dérivée de l'identifiant de l'unité, donc les
 * clés d'exercice sont stables d'un lancement à l'autre (la progression y est
 * rattachée). Les distracteurs viennent du même sous-thème quand il en a
 * assez, sinon de la même matière.
 */

import type { Exercise, MatchExercise, QcmExercise } from '@/game';
import { hashString, mulberry32 } from '@/lib/random';

import type { Card, CardSlice, Unit } from './types';

const CLOZE = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;

export function resolveUnitCards(unit: Unit, deck: readonly Card[]): Card[] {
  if (unit.cards.length === 0) return [];
  if (typeof unit.cards[0] === 'string') {
    const byId = new Map(deck.map((c) => [c.id, c]));
    return (unit.cards as string[]).map((id) => byId.get(id)).filter((c): c is Card => c !== undefined);
  }
  const out: Card[] = [];
  for (const slice of unit.cards as CardSlice[]) {
    const topic = deck.filter((c) => c.subject === unit.subjectId && c.topic === slice.topic);
    out.push(...topic.slice(slice.from, slice.to));
  }
  return out;
}

/** La définition sans son développement d'acronyme, tronquée pour une carte d'association. */
export function shortDefinition(definition: string, max = 72): string {
  let text = definition;
  // « Click-Through Rate: The percentage… » → on garde la partie après le deux-points.
  const colon = text.indexOf(': ');
  if (colon > 0 && colon < 40) text = text.slice(colon + 2);
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : max)}…`;
}

function pick<T>(items: readonly T[], n: number, rng: () => number, exclude: (t: T) => boolean): T[] {
  const pool = items.filter((t) => !exclude(t));
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n && used.size < pool.length) {
    const i = Math.floor(rng() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(pool[i]);
  }
  return out;
}

function distractorPool(card: Card, subjectCards: readonly Card[]): readonly Card[] {
  const sameTopic = subjectCards.filter((c) => c.topic === card.topic && c.id !== card.id);
  return sameTopic.length >= 6 ? sameTopic : subjectCards.filter((c) => c.id !== card.id);
}

function explainFor(card: Card): string {
  return card.example ? `${card.term} — ${card.definition}\n\nExemple : ${card.example}` : `${card.term} — ${card.definition}`;
}

export function generateExercises(
  unit: Unit,
  unitCards: readonly Card[],
  subjectCards: readonly Card[],
): Exercise[] {
  const rng = mulberry32(hashString(unit.id));
  const out: Exercise[] = [];

  unitCards.forEach((card, index) => {
    const pool = distractorPool(card, subjectCards);
    // On alterne les deux sens : terme → définition, définition → terme.
    if (index % 2 === 0) {
      const wrong = pick(pool, 3, rng, (c) => c.definition === card.definition);
      const qcm: QcmExercise = {
        kind: 'qcm',
        key: `${unit.id}:def:${card.id}`,
        unitId: unit.id,
        cardId: card.id,
        prompt: `Que signifie « ${card.term} » ?`,
        choices: [card.definition, ...wrong.map((c) => c.definition)],
        answer: 0,
        explain: explainFor(card),
      };
      out.push(qcm);
    } else {
      const wrong = pick(pool, 3, rng, (c) => c.term.toLowerCase() === card.term.toLowerCase());
      const qcm: QcmExercise = {
        kind: 'qcm',
        key: `${unit.id}:term:${card.id}`,
        unitId: unit.id,
        cardId: card.id,
        prompt: `Quel terme correspond à cette définition ?\n\n${card.definition}`,
        choices: [card.term, ...wrong.map((c) => c.term)],
        answer: 0,
        explain: explainFor(card),
      };
      out.push(qcm);
    }

    if (card.cloze) {
      const answers: string[] = [];
      const text = card.cloze.replace(CLOZE, (_m, answer: string) => {
        answers.push(answer);
        return '___';
      });
      if (answers.length === 1) {
        const others = subjectCards.filter((c) => c.cloze && c.id !== card.id);
        const bank = pick(others, 3, rng, () => false).map((c) => {
          const m = CLOZE.exec(c.cloze as string);
          CLOZE.lastIndex = 0;
          return m ? m[1] : c.term;
        });
        out.push({
          kind: 'cloze',
          key: `${unit.id}:cloze:${card.id}`,
          unitId: unit.id,
          cardId: card.id,
          text: `${card.term} : ${text}`,
          answer: answers[0],
          bank: bank.filter((b) => b !== answers[0]),
          explain: explainFor(card),
        });
      }
    }
  });

  // Associations par groupes de 4 (le dernier groupe peut en avoir 3).
  for (let i = 0; i + 3 <= unitCards.length; i += 4) {
    const group = unitCards.slice(i, i + 4);
    const match: MatchExercise = {
      kind: 'match',
      key: `${unit.id}:match:${i / 4}`,
      unitId: unit.id,
      prompt: 'Associe chaque terme à sa définition',
      pairs: group.map((c) => ({ left: c.term, right: shortDefinition(c.definition) })),
    };
    out.push(match);
  }

  return out;
}
