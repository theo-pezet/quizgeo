import deckJson from '@/data/deck.json';

import { EXTRA_CARDS } from './cards.extra';
import type { Card } from './types';

const deck = deckJson as { version: number; cards: Card[] };

/** Le classeur Excel importé, puis les cartes écrites à la main. */
export const CARDS: readonly Card[] = [...deck.cards, ...EXTRA_CARDS];
export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(CARDS.map((c) => [c.id, c]));
export const CARD_IDS: readonly string[] = CARDS.map((c) => c.id);

export function cardsOf(subject: string, topic?: string): Card[] {
  return CARDS.filter((c) => c.subject === subject && (topic === undefined || c.topic === topic));
}

export function cardIdsOf(subject: string): string[] {
  return CARDS.filter((c) => c.subject === subject).map((c) => c.id);
}
