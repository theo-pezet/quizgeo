/**
 * Le défi du mois : vingt leçons dans le mois civil, une médaille et des
 * gemmes à la clé. Le compteur repart à zéro chaque mois ; les médailles
 * restent (collection dans le Profil). Comme les badges mensuels de Duolingo :
 * un objectif à moyen terme entre la série (jour) et les couronnes (long).
 */

import type { DayKey, MonthlyState } from './types';

export const MONTHLY_TARGET = 20;
export const MONTHLY_REWARD = 100;

/** « 2026-09 » depuis « 2026-09-14 ». */
export function monthOf(day: DayKey): string {
  return day.slice(0, 7);
}

export function emptyMonthly(): MonthlyState {
  return { month: null, lessons: 0, claimed: false, medals: [] };
}

/** Remet le compteur à zéro si le mois a changé. Idempotent le même mois. */
export function ensureMonthly(state: MonthlyState, today: DayKey): MonthlyState {
  const month = monthOf(today);
  if (state.month === month) return state;
  return { ...state, month, lessons: 0, claimed: false };
}

/** Une leçon de plus ce mois ; `completed` quand la vingtième tombe. */
export function recordMonthlyLesson(state: MonthlyState, today: DayKey): { state: MonthlyState; completed: boolean } {
  const cur = ensureMonthly(state, today);
  const lessons = cur.lessons + 1;
  if (!cur.claimed && lessons >= MONTHLY_TARGET) {
    const month = monthOf(today);
    return {
      state: { ...cur, lessons, claimed: true, medals: cur.medals.includes(month) ? cur.medals : [...cur.medals, month] },
      completed: true,
    };
  }
  return { state: { ...cur, lessons }, completed: false };
}

export function monthlyRatio(state: MonthlyState): number {
  return Math.min(1, state.lessons / MONTHLY_TARGET);
}
