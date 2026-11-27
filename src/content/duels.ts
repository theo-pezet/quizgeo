/**
 * La matière des duels (voir src/game/duels.ts) : pour une paire de notions
 * confondues, un indice (la définition ou l'exemple de l'une, les DEUX termes
 * masqués) et les deux cartes, pour les montrer côte à côte après la réponse.
 */

import { pickDuelPairs, type CardState, type DayKey, type Progress, type Rng } from '@/game';

import { foldKey, maskTerm, mentionsTerm, termVariants, usefulLength } from './cardText';
import { confusablesOf, shownDefinition } from './generate';
import type { Card } from './types';

/** En dessous, l'indice ne permet plus de trancher. */
const MIN_USEFUL = 25;
/** Paires candidates tirées au plus des notions ratées. */
const MAX_CANDIDATES = 20;

export interface DuelItem {
  /** La notion décrite par l'indice. */
  target: Card;
  /** Sa jumelle. */
  other: Card;
  clue: string;
  source: 'definition' | 'example';
}

function variants(card: Card) {
  return termVariants(card.term, [], card.definition);
}

function hides(text: string, card: Card): boolean {
  if (mentionsTerm(text, variants(card))) return false;
  const term = foldKey(card.term);
  return term.length < 3 || !foldKey(text).includes(term);
}

function clueFor(target: Card, other: Card): { clue: string; source: DuelItem['source'] } | null {
  const sources: [string | undefined, DuelItem['source']][] = [
    [shownDefinition(target, 'en').text, 'definition'],
    [target.example, 'example'],
  ];
  for (const [text, source] of sources) {
    if (!text) continue;
    const clue = maskTerm(maskTerm(text, variants(target)), variants(other)).replace(/\s+/g, ' ').trim();
    if (usefulLength(clue) >= MIN_USEFUL && hides(clue, target) && hides(clue, other)) return { clue, source };
  }
  return null;
}

/** Un duel pour la paire, la notion décrite tirée au sort ; null si aucun indice ne tient. */
export function duelItem(a: Card, b: Card, rng: Rng): DuelItem | null {
  if (foldKey(a.term) === foldKey(b.term)) return null;
  const [first, second] = rng() < 0.5 ? [a, b] : [b, a];
  for (const [target, other] of [
    [first, second],
    [second, first],
  ] as const) {
    const found = clueFor(target, other);
    if (found) return { target, other, ...found };
  }
  return null;
}

/**
 * Les paires connues (confusables.json) voisines des notions que
 * l'apprenant a ratées au deck (au moins un oubli, ou en réapprentissage) :
 * même matière, termes différents. Les plus oubliées d'abord.
 */
export function duelCandidates(cards: Readonly<Record<string, CardState>>, byId: ReadonlyMap<string, Card>): [string, string][] {
  const struggling = Object.values(cards)
    .filter((c) => c.lapses > 0 || c.phase === 'learning')
    .sort((x, y) => y.lapses - x.lapses || x.id.localeCompare(y.id));
  const out: [string, string][] = [];
  for (const state of struggling) {
    const card = byId.get(state.id);
    if (!card) continue;
    for (const id of confusablesOf(card.id)) {
      const rival = byId.get(id);
      if (!rival || rival.subject !== card.subject || foldKey(rival.term) === foldKey(card.term)) continue;
      out.push([card.id, rival.id]);
      if (out.length >= MAX_CANDIDATES) return out;
    }
  }
  return out;
}

/**
 * Les duels à jouer maintenant : les paires choisies par pickDuelPairs
 * (confusions personnelles d'abord), sans celles dont une carte a disparu ou
 * qui n'ont pas d'indice propre. `limit` duels au plus.
 */
export function duelsFor(progress: Progress, byId: ReadonlyMap<string, Card>, today: DayKey, limit: number, rng: Rng): DuelItem[] {
  const pairs = pickDuelPairs(progress.confusions, duelCandidates(progress.cards, byId), today, limit * 3);
  const out: DuelItem[] = [];
  for (const [a, b] of pairs) {
    const x = byId.get(a);
    const y = byId.get(b);
    const item = x && y ? duelItem(x, y, rng) : null;
    if (item) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
