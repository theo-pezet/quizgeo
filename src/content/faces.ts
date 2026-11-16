/**
 * La matière de chaque visage d'une carte du deck (voir src/game/faces.ts) :
 * quoi montrer côté question, terme masqué. Un visage n'est proposé que si
 * la carte le permet proprement (assez de texte une fois le terme masqué,
 * aucune fuite de la réponse).
 */

import type { CardFace, FaceAvailability } from '@/game';

import { MASK, foldKey, maskTerm, mentionsTerm, termVariants, usefulLength } from './cardText';
import { confusablesOf, shownDefinition } from './generate';
import type { Card } from './types';

/** En dessous, il ne reste pas assez d'indices une fois le terme masqué. */
const MIN_USEFUL = 25;
const CLOZE = /\{\{c\d+::(.*?)(?:::.*?)?\}\}/g;

export interface FaceMaterial {
  /** La définition, terme masqué (« Which term is this? »). */
  definition?: string;
  /** L'exemple, terme masqué (« Which term does this illustrate? »). */
  example?: string;
  /** La définition à trou et son mot manquant. */
  cloze?: { text: string; answer: string };
  /** La notion jumelle (duel) et la définition de la carte, les deux termes masqués. */
  duel?: { rival: Card; definition: string };
}

function variants(card: Card) {
  return termVariants(card.term, [], card.definition);
}

/** Le texte masqué ne donne-t-il plus le terme ? */
function hidesTerm(text: string, card: Card): boolean {
  const v = variants(card);
  if (mentionsTerm(text, v)) return false;
  const term = foldKey(card.term);
  return term.length < 3 || !foldKey(text).includes(term);
}

const cache = new WeakMap<Card, FaceMaterial>();

export function faceMaterial(card: Card, byId: ReadonlyMap<string, Card>): FaceMaterial {
  const cached = cache.get(card);
  if (cached) return cached;
  const out: FaceMaterial = {};

  const def = shownDefinition(card, 'en').text;
  if (usefulLength(def) >= MIN_USEFUL && hidesTerm(def, card)) out.definition = def;

  if (card.example) {
    const ex = maskTerm(card.example, variants(card)).replace(/\s+/g, ' ').trim();
    if (usefulLength(ex) >= MIN_USEFUL && hidesTerm(ex, card)) out.example = ex;
  }

  if (card.cloze) {
    const answers: string[] = [];
    const text = card.cloze.replace(CLOZE, (_m, a: string) => {
      answers.push(a);
      return MASK;
    });
    if (answers.length === 1 && !foldKey(text.split(MASK).join(' ')).includes(foldKey(answers[0]))) out.cloze = { text, answer: answers[0] };
  }

  if (out.definition) {
    // La jumelle : une carte confondable du MÊME sous-thème (les rapprochements
    // lexicaux entre sous-thèmes, « Chain of Thought » / « Markov Chain », sont du bruit).
    const rival = confusablesOf(card.id)
      .map((id) => byId.get(id))
      .find((c): c is Card => c !== undefined && c.subject === card.subject && c.topic === card.topic && foldKey(c.term) !== foldKey(card.term));
    if (rival) {
      const both = maskTerm(out.definition, variants(rival));
      if (hidesTerm(both, rival)) out.duel = { rival, definition: both };
    }
  }

  cache.set(card, out);
  return out;
}

export function faceAvailability(m: FaceMaterial): FaceAvailability {
  return { definition: !!m.definition, example: !!m.example, cloze: !!m.cloze, duel: !!m.duel };
}

export type { CardFace };
