/**
 * La série quotidienne
 *
 * Un jour est actif quand une session d'au moins 5 questions y est terminée,
 * en heure LOCALE. Le gel est la seule concession à la vie réelle : il se
 * consomme tout seul, une journée manquée à la fois.
 */

import { addDays, daysBetween } from './dates';
import { MIN_SESSION_LENGTH } from './xp';
import type { DayKey, StreakState } from './types';

export const MAX_FREEZES = 2;
export const DAYS_PER_FREEZE = 7;

export interface StreakUpdate {
  streak: StreakState;
  /** La série a-t-elle augmenté ? (pour l'animation de la flamme) */
  incremented: boolean;
  /** La série est-elle repartie de 1 après une coupure ? */
  reset: boolean;
  /** Jour couvert par un gel, s'il y en a eu un. */
  freezeConsumedFor: DayKey | null;
  /** Un gel a-t-il été gagné à ce palier de 7 ? */
  freezeGained: boolean;
}

/** Une session compte pour la série si elle atteint 5 questions terminées. */
export function sessionCountsForStreak(questionCount: number): boolean {
  return questionCount >= MIN_SESSION_LENGTH;
}

/**
 * Enregistre un jour actif.
 *
 * Sécurité horloge : si `lastActiveDay` est postérieur à `today`, l'utilisateur
 * a reculé son horloge ou changé de fuseau vers l'ouest. On traite ce cas comme
 * « déjà actif aujourd'hui » plutôt que de casser la série.
 */
export function recordActiveDay(state: StreakState, today: DayKey): StreakUpdate {
  const unchanged = (extra?: Partial<StreakUpdate>): StreakUpdate => ({
    streak: { ...state, freezeUsedOn: [...state.freezeUsedOn] },
    incremented: false,
    reset: false,
    freezeConsumedFor: null,
    freezeGained: false,
    ...extra,
  });

  const last = state.lastActiveDay;

  if (last !== null && last >= today) {
    // Déjà actif aujourd'hui, ou horloge dans le futur : on ne touche à rien,
    // sauf à recaler lastActiveDay sur aujourd'hui si l'horloge a reculé.
    const result = unchanged();
    result.streak.lastActiveDay = today;
    return result;
  }

  const gap = last === null ? Infinity : daysBetween(last, today);
  const yesterday = addDays(today, -1);

  let current: number;
  let freezes = state.freezes;
  const freezeUsedOn = [...state.freezeUsedOn];
  let freezeConsumedFor: DayKey | null = null;
  let reset = false;

  if (gap === 1) {
    current = state.current + 1;
  } else if (gap === 2 && freezes > 0) {
    // Une seule journée manquée, et un gel en réserve : la série continue.
    freezes -= 1;
    freezeConsumedFor = yesterday;
    freezeUsedOn.push(yesterday);
    current = state.current + 1;
  } else {
    // Premier jour, ou deux jours manqués : la série repart de 1, même avec
    // deux gels en réserve.
    current = 1;
    reset = state.current > 1 || last !== null;
  }

  let freezeGained = false;
  if (current > 0 && current % DAYS_PER_FREEZE === 0 && freezes < MAX_FREEZES) {
    freezes += 1;
    freezeGained = true;
  }

  return {
    streak: {
      current,
      best: Math.max(state.best, current),
      lastActiveDay: today,
      freezes,
      freezeUsedOn,
    },
    incremented: current > state.current,
    reset,
    freezeConsumedFor,
    freezeGained,
  };
}

/** La flamme est-elle allumée ? Le chiffre, lui, reste visible dans les deux cas. */
export function isActiveToday(state: StreakState, today: DayKey): boolean {
  return state.lastActiveDay !== null && state.lastActiveDay >= today;
}

/**
 * La série est-elle encore tenable aujourd'hui, ou est-elle déjà perdue ?
 * Sert au libellé du Profil, pas au calcul : rien n'est écrit avant une session.
 */
export function streakIsAtRisk(state: StreakState, today: DayKey): boolean {
  if (state.lastActiveDay === null || state.current === 0) return false;
  return !isActiveToday(state, today);
}
