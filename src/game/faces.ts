/**
 * « Une carte, plusieurs visages » : à chaque révision du deck, une carte ne
 * se présente pas toujours de la même façon.
 *
 * Pourquoi : montrer toujours le terme puis la définition apprend à
 * reconnaître LA CARTE (sa forme, sa position) plutôt que la notion. Varier
 * l'indice de rappel (définition → terme, exemple → terme, texte à trou)
 * force à récupérer la notion par plusieurs chemins : c'est l'effet de
 * production (« generation effect ») et la pratique variée, qui donnent un
 * souvenir plus solide et mieux transférable. Les cartes qui rechutent
 * (« leeches ») passent en DUEL contre la notion qu'on confond avec elles :
 * l'entraînement à la discrimination vise exactement l'erreur commise.
 *
 * Règles :
 *   - une carte qu'on découvre (moins de MIN_REPS_BEFORE_VARYING révisions)
 *     se montre côté terme : on encode avant de varier ;
 *   - une carte qui a rechuté LEECH_LAPSES fois, quand elle a une jumelle,
 *     passe en duel une révision sur deux ;
 *   - sinon, un visage au hasard parmi ceux que la carte permet, jamais le
 *     même que la dernière fois, les visages « production » pesant double.
 *
 * Pur : le hasard arrive en paramètre.
 */

import type { CardFace, CardState, Rng } from './types';

export const CARD_FACES: readonly CardFace[] = ['term', 'definition', 'example', 'cloze', 'duel'];
export const MIN_REPS_BEFORE_VARYING = 2;
export const LEECH_LAPSES = 2;

/** Ce que la carte permet : chaque visage a besoin de matière (exemple, trou, jumelle). */
export interface FaceAvailability {
  definition: boolean;
  example: boolean;
  cloze: boolean;
  duel: boolean;
}

const WEIGHT: Record<Exclude<CardFace, 'duel'>, number> = { term: 1, definition: 2, example: 2, cloze: 2 };

export function pickCardFace(card: CardState | undefined, available: FaceAvailability, rng: Rng): CardFace {
  if (card === undefined || card.reps < MIN_REPS_BEFORE_VARYING) return 'term';
  if (available.duel && card.lapses >= LEECH_LAPSES && card.lastFace !== 'duel') return 'duel';
  const pool = (['term', 'definition', 'example', 'cloze'] as const).filter((f) => f === 'term' || available[f]);
  const fresh = pool.length > 1 ? pool.filter((f) => f !== card.lastFace) : pool;
  const total = fresh.reduce((n, f) => n + WEIGHT[f], 0);
  let r = rng() * total;
  for (const f of fresh) {
    r -= WEIGHT[f];
    if (r < 0) return f;
  }
  return fresh[fresh.length - 1];
}
