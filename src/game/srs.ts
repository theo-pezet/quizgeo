/**
 * Répétition espacée du deck — le côté « Anki » de l'app.
 *
 * Algorithme dérivé de SM-2, à la journée : une carte a une phase (nouvelle,
 * en apprentissage, en révision), une facilité et un intervalle en jours.
 * Quatre réponses possibles, comme Anki : Encore / Difficile / Bien / Facile.
 *
 * Tout est pur : l'horloge arrive en paramètre (`today`, `now`), le hasard
 * aussi. Le store ne fait que persister ce qui sort d'ici.
 */

import { addDays, daysBetween } from './dates';
import type { CardState, DayKey, IsoDate, Rng } from './types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

/** Facilité de départ : 250 %. Plancher : 130 %. Exprimées ×1000. */
export const EASE_START = 2500;
export const EASE_MIN = 1300;
export const EASE_BONUS_EASY = 150;
export const EASE_PENALTY_HARD = 150;
export const EASE_PENALTY_LAPSE = 200;

/** Intervalles de sortie d'apprentissage. */
export const GRADUATE_INTERVAL = 3;
export const EASY_GRADUATE_INTERVAL = 4;
export const MAX_INTERVAL = 365;

export function emptyCardState(id: string): CardState {
  return {
    id,
    phase: 'new',
    ease: EASE_START,
    intervalDays: 0,
    due: null,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
  };
}

/** Une carte jamais vue est due ; une carte planifiée l'est dès son jour `due`. */
export function isDue(card: CardState | undefined, today: DayKey): boolean {
  if (card === undefined || card.due === null) return true;
  return card.due <= today;
}

function clampEase(ease: number): number {
  return Math.max(EASE_MIN, ease);
}

function clampInterval(days: number): number {
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(days)));
}

/**
 * Applique une réponse à une carte et rend son nouvel état.
 *
 * Apprentissage (nouvelle ou en cours) :
 *   - Encore / Difficile : on la repose aujourd'hui (intervalle 0).
 *   - Bien : premier « bien » → demain ; deuxième → sortie à 3 jours.
 *   - Facile : sortie immédiate à 4 jours, facilité +15 %.
 * Révision (comme SM-2 dans Anki, le retard compte : une carte retenue
 * malgré 30 jours de retard a prouvé plus que son intervalle) :
 *   - Encore : rechute. Retour en apprentissage, aujourd'hui, facilité −20 %.
 *   - Difficile : (intervalle + retard/4) × 1,2, facilité −15 %.
 *   - Bien : (intervalle + retard/2) × facilité, au moins Difficile + 1 jour.
 *   - Facile : (intervalle + retard) × facilité × 1,3, facilité +15 %, au
 *     moins Bien + 1 jour. Les trois boutons ne proposent jamais le même délai.
 */
export function reviewCard(
  before: CardState | undefined,
  id: string,
  grade: Grade,
  today: DayKey,
  now: IsoDate,
): CardState {
  const prev = before ?? emptyCardState(id);
  const base = { ...prev, id, reps: prev.reps + 1, lastReviewedAt: now };

  if (prev.phase !== 'review') {
    switch (grade) {
      case 'again':
      case 'hard':
        return { ...base, phase: 'learning', intervalDays: 0, due: today };
      case 'good':
        if (prev.intervalDays === 0) {
          return { ...base, phase: 'learning', intervalDays: 1, due: addDays(today, 1) };
        }
        return {
          ...base,
          phase: 'review',
          intervalDays: GRADUATE_INTERVAL,
          due: addDays(today, GRADUATE_INTERVAL),
        };
      case 'easy':
        return {
          ...base,
          phase: 'review',
          intervalDays: EASY_GRADUATE_INTERVAL,
          due: addDays(today, EASY_GRADUATE_INTERVAL),
          ease: prev.ease + EASE_BONUS_EASY,
        };
    }
  }

  if (grade === 'again') {
    return {
      ...base,
      phase: 'learning',
      intervalDays: 0,
      due: today,
      ease: clampEase(prev.ease - EASE_PENALTY_LAPSE),
      lapses: prev.lapses + 1,
    };
  }
  const intervals = reviewIntervals(prev, today);
  const intervalDays = intervals[grade];
  const ease =
    grade === 'hard' ? clampEase(prev.ease - EASE_PENALTY_HARD) : grade === 'easy' ? prev.ease + EASE_BONUS_EASY : prev.ease;
  return { ...base, intervalDays, due: addDays(today, intervalDays), ease };
}

/**
 * Les trois intervalles d'une carte en révision, retard compris, strictement
 * croissants (dans la limite de MAX_INTERVAL).
 */
function reviewIntervals(prev: CardState, today: DayKey): Record<'hard' | 'good' | 'easy', number> {
  const delay = prev.due === null ? 0 : Math.max(0, daysBetween(prev.due, today));
  const iv = prev.intervalDays;
  const hard = clampInterval((iv + delay / 4) * 1.2);
  const good = Math.min(MAX_INTERVAL, Math.max(hard + 1, clampInterval(((iv + delay / 2) * prev.ease) / 1000)));
  const easy = Math.min(MAX_INTERVAL, Math.max(good + 1, clampInterval(((iv + delay) * prev.ease * 1.3) / 1000)));
  return { hard, good, easy };
}

/** Intervalle qu'obtiendrait la carte pour chaque réponse — pour l'étiquette des boutons. */
export function previewIntervals(
  card: CardState | undefined,
  id: string,
  today: DayKey,
): Record<Grade, number> {
  const out = {} as Record<Grade, number>;
  for (const grade of GRADES) {
    out[grade] = reviewCard(card, id, grade, today, '1970-01-01T00:00:00.000Z').intervalDays;
  }
  return out;
}

export interface DeckStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  /** Cartes à revoir aujourd'hui, nouvelles exclues. */
  dueToday: number;
}

export function deckStats(
  cards: Record<string, CardState>,
  ids: readonly string[],
  today: DayKey,
): DeckStats {
  const stats: DeckStats = { total: ids.length, new: 0, learning: 0, review: 0, dueToday: 0 };
  for (const id of ids) {
    const card = cards[id];
    if (card === undefined || card.phase === 'new') {
      stats.new += 1;
      continue;
    }
    if (card.phase === 'learning') stats.learning += 1;
    else stats.review += 1;
    if (isDue(card, today)) stats.dueToday += 1;
  }
  return stats;
}

export interface DeckSessionOptions {
  /** Nombre maximal de cartes dans la session. */
  limit: number;
  /** Nombre maximal de cartes NOUVELLES introduites dans la session. */
  newLimit: number;
}

export const DEFAULT_DECK_SESSION: DeckSessionOptions = { limit: 20, newLimit: 8 };

/**
 * Compose une session de révision : d'abord les cartes dues (les plus en
 * retard en premier), puis des cartes nouvelles tirées au hasard, dans la
 * limite de `newLimit`. Une session peut être plus courte que `limit` ; elle
 * n'est jamais complétée avec des cartes non dues.
 */
export function composeDeckSession(
  cards: Record<string, CardState>,
  ids: readonly string[],
  today: DayKey,
  rng: Rng,
  options: DeckSessionOptions = DEFAULT_DECK_SESSION,
): string[] {
  const due: CardState[] = [];
  const fresh: string[] = [];
  for (const id of ids) {
    const card = cards[id];
    if (card === undefined || card.phase === 'new') fresh.push(id);
    else if (isDue(card, today)) due.push(card);
  }
  due.sort((a, b) => {
    const byDue = (a.due as string).localeCompare(b.due as string);
    return byDue !== 0 ? byDue : a.id.localeCompare(b.id);
  });

  const out = due.map((c) => c.id).slice(0, options.limit);
  const room = Math.min(options.newLimit, options.limit - out.length);
  if (room > 0 && fresh.length > 0) {
    const shuffled = [...fresh];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    out.push(...shuffled.slice(0, room));
  }
  return out;
}

/** Une réponse « Encore » est une erreur ; les trois autres valent une bonne réponse. */
export function gradeIsCorrect(grade: Grade): boolean {
  return grade !== 'again';
}
