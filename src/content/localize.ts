/**
 * Le contenu dans la langue de l'utilisateur.
 *
 * Deux sources, deux langues d'origine : le classeur Excel est en anglais
 * (traduit vers fr / es dans src/data/i18n/deck.*.json), les cartes et les
 * exercices écrits à la main sont en français (traduits vers en / es dans
 * xcards.*.json et extras.*.json). Les identifiants et les clés d'exercice ne
 * changent jamais : la progression y est rattachée, quelle que soit la langue.
 * Une traduction manquante retombe sur la langue d'origine, jamais sur du vide.
 */

import deckJson from '@/data/deck.json';
import deckEs from '@/data/i18n/deck.es.json';
import deckFr from '@/data/i18n/deck.fr.json';
import extrasEn from '@/data/i18n/extras.en.json';
import extrasEs from '@/data/i18n/extras.es.json';
import xcardsEn from '@/data/i18n/xcards.en.json';
import xcardsEs from '@/data/i18n/xcards.es.json';
import type { Exercise } from '@/game';

import { EXTRA_CARDS } from './cards.extra';
import { EXTRA_EXERCISES } from './extras';
import type { Card } from './types';

export type ContentLang = 'fr' | 'en' | 'es';

interface CardText {
  term: string;
  definition: string;
  example: string;
  cloze?: string;
}

type CardTable = Record<string, CardText>;
type ExerciseTable = Record<string, Record<string, unknown>>;

const DECK = (deckJson as { cards: Card[] }).cards;
const DECK_TEXT: Partial<Record<ContentLang, CardTable>> = { fr: deckFr as CardTable, es: deckEs as CardTable };
const XCARDS_TEXT: Partial<Record<ContentLang, CardTable>> = { en: xcardsEn as CardTable, es: xcardsEs as CardTable };
const EXTRAS_TEXT: Partial<Record<ContentLang, ExerciseTable>> = { en: extrasEn as ExerciseTable, es: extrasEs as ExerciseTable };

function overlayCard(card: Card, table: CardTable | undefined): Card {
  const text = table?.[card.id];
  if (!text) return card;
  const out: Card = { ...card, term: text.term, definition: text.definition, example: text.example };
  if (card.cloze) out.cloze = text.cloze && text.cloze.includes('{{c1::') ? text.cloze : card.cloze;
  return out;
}

/** Toutes les cartes (classeur puis cartes manuelles), dans la langue demandée. */
export function localizedCards(lang: ContentLang): Card[] {
  return [...DECK.map((c) => overlayCard(c, DECK_TEXT[lang])), ...EXTRA_CARDS.map((c) => overlayCard(c, XCARDS_TEXT[lang]))];
}

/** Les exercices écrits à la main, dans la langue demandée. */
export function localizedExtras(lang: ContentLang): Exercise[] {
  const table = EXTRAS_TEXT[lang];
  if (!table) return [...EXTRA_EXERCISES];
  return EXTRA_EXERCISES.map((e) => {
    const text = table[e.key];
    if (!text) return e;
    switch (e.kind) {
      case 'case':
        return {
          ...e,
          ...(text as Partial<typeof e>),
          steps: e.steps.map((s, i) => ({ ...s, ...((text.steps as Partial<(typeof e.steps)[number]>[] | undefined)?.[i] ?? {}) })),
        };
      default:
        return { ...e, ...(text as Partial<typeof e>) } as Exercise;
    }
  });
}
