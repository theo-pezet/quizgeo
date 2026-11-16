/**
 * Cartes écrites à la main, en complément du classeur Excel
 * (src/data/cards.manual.json, en anglais).
 *
 * Convention d'identifiant : `<matière>-x-<slug>` ; le préfixe `x` évite toute
 * collision avec les identifiants générés depuis le classeur. Les slugs
 * viennent des premiers termes (en français) : ils ne changent JAMAIS, la
 * progression y est rattachée. Le préfixe historique `web-x-` est conservé
 * pour HTML, CSS et JavaScript.
 */

import manual from '@/data/cards.manual.json';

import type { Card } from './types';

export const EXTRA_CARDS: readonly Card[] = (manual as { cards: Card[] }).cards;
