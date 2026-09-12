import type { SubjectId, UnitId } from '@/game';

export interface Subject {
  id: SubjectId;
  title: string;
  tagline: string;
  emoji: string;
  color: string;
}

export type CardLevel = 'debutant' | 'intermediaire' | 'avance';

/** Une carte du deck, telle que produite par tools/build_deck.py. */
export interface Card {
  id: string;
  subject: SubjectId;
  topic: string;
  level: CardLevel | null;
  term: string;
  definition: string;
  example: string;
  tags: string[];
  /** Définition avec ses trous {{c1::…}} intacts, quand il y en a. */
  cloze?: string;
}

/** Tranche [from, to) des cartes d'un sous-thème, dans l'ordre du deck. */
export interface CardSlice {
  topic: string;
  from: number;
  to: number;
}

export interface Unit {
  id: UnitId;
  subjectId: SubjectId;
  title: string;
  description: string;
  /** Cartes de l'unité : par tranches de sous-thème, ou par identifiants. Vide = exercices écrits à la main seulement. */
  cards: CardSlice[] | string[];
}
