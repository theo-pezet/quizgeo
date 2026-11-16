/**
 * Toutes les cartes et tous les exercices écrits à la main.
 *
 * L'application est en anglais uniquement depuis la 1.3 : le classeur Excel
 * (deck.json), les cartes manuelles (cards.manual.json), les exercices
 * manuels (exercises.manual.json) et les unités JSON sont tous rédigés en
 * anglais, avec les termes exacts du métier. Les identifiants et les clés
 * d'exercice n'ont pas changé : la progression y est rattachée.
 */

import deckJson from '@/data/deck.json';
import type { Exercise } from '@/game';

import { EXTRA_CARDS } from './cards.extra';
import { extraCards, extraExercises } from './extra';
import { EXTRA_EXERCISES } from './extras';
import type { Card } from './types';

export type ContentLang = 'en';

const DECK = (deckJson as { cards: Card[] }).cards;

/** Toutes les cartes : classeur, cartes manuelles, cartes des unités JSON. */
export function localizedCards(_lang: ContentLang = 'en'): Card[] {
  return [...DECK, ...EXTRA_CARDS, ...extraCards()];
}

/** Les exercices écrits à la main (TS historiques puis JSON). */
export function localizedExtras(_lang: ContentLang = 'en'): Exercise[] {
  return [...EXTRA_EXERCISES, ...extraExercises()];
}
