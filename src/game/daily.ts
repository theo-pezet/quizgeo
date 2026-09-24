/**
 * L'objectif quotidien : des XP à gagner chaque jour, choisis par
 * l'utilisateur. Une seule récompense par jour quand il est atteint.
 */

import { GEMS, addGems } from './economy';
import type { DailyState, DayKey, Progress } from './types';

/**
 * Remet le compteur à zéro si le jour a changé. Idempotent. Un jour ANTÉRIEUR
 * (fuseau, horloge reculée) ne change rien : l'objectif n'est pas rejoué.
 */
export function ensureDaily(state: DailyState, today: DayKey): DailyState {
  if (state.day === today) return state;
  if (state.day !== null && today < state.day) return state;
  return { ...state, day: today, xp: 0 };
}

export interface DailyCredit {
  progress: Progress;
  /** L'objectif vient d'être atteint (une fois par jour). */
  goalReached: boolean;
}

/** Crédite des XP au jour courant ; verse la récompense si l'objectif tombe. */
export function creditDailyXp(progress: Progress, amount: number, today: DayKey): DailyCredit {
  if (amount <= 0) return { progress, goalReached: false };
  const daily = ensureDaily(progress.daily, today);
  const xp = daily.xp + amount;
  // Le jour du compteur, pas `today` : si l'horloge a reculé, le compteur
  // reste sur le jour le plus récent et l'objectif ne tombe qu'une fois.
  const day = daily.day as DayKey;
  const goalReached = xp >= daily.goal && daily.metOn !== day;
  const next: Progress = {
    ...progress,
    daily: { ...daily, xp, metOn: goalReached ? day : daily.metOn },
  };
  if (!goalReached) return { progress: next, goalReached };
  return {
    progress: {
      ...next,
      gems: addGems(next.gems, GEMS.dailyGoal),
      counters: { ...next.counters, goalDays: next.counters.goalDays + 1 },
    },
    goalReached,
  };
}

export function dailyRatio(state: DailyState, today: DayKey): number {
  const d = ensureDaily(state, today);
  return d.goal <= 0 ? 1 : Math.min(1, d.xp / d.goal);
}

export function isGoalMet(state: DailyState, today: DayKey): boolean {
  const d = ensureDaily(state, today);
  return d.metOn === d.day;
}
