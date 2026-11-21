/**
 * Le temps d'étude : l'objectif en MINUTES (1 h 30 par défaut), avec ses
 * récompenses et ses pénalités.
 *
 * - Chaque réponse (leçon, révision, deck, Blitz) crédite le temps écoulé
 *   depuis la précédente, plafonné : une appli ouverte dans une poche ne
 *   compte pas.
 * - Atteindre la moitié puis la totalité de l'objectif rapporte des gemmes ;
 *   une série de jours « objectif tenu » rapporte des paliers.
 * - Un jour terminé sous l'objectif coûte des gemmes, remet la série à zéro
 *   et ajoute une dette de minutes au lendemain (plafonnée).
 *
 * Le bilan des jours passés se fait à l'ouverture (applyTick) : un jour
 * entièrement manqué, appli fermée, est donc pénalisé lui aussi. Il est
 * annoncé une fois (`report`), puis acquitté.
 */

import { addDays, daysBetween } from './dates';
import { addGems } from './economy';
import type { DayKey, Progress, StudyReport, StudyState } from './types';

/** Doit rester égal à la valeur d'emptyStudy (types.ts). */
export const DEFAULT_STUDY_MINUTES = 90;
export const STUDY_GOAL_CHOICES = [30, 45, 60, 90, 120] as const;
/** Temps crédité au plus par réponse : au-delà, l'apprenant n'était plus là. */
export const MAX_SECONDS_PER_ANSWER = 180;
/** Dette maximale reportée sur la journée, en minutes. */
export const MAX_DEBT_MINUTES = 45;
/** Gemmes perdues au plus pour une journée manquée. */
export const MAX_DAY_PENALTY = 60;
/** Jours passés examinés au plus à l'ouverture (une longue absence ne ruine pas tout). */
export const MAX_SETTLED_DAYS = 14;
/** Historique gardé, en jours. */
export const HISTORY_DAYS = 35;

export const STUDY_GEMS = {
  half: 10,
  goal: 30,
  streakMilestones: { 7: 100, 30: 400, 100: 1000 } as Record<number, number>,
} as const;

/**
 * La part de l'objectif conseillée par matière, en pourcentage : marketing et
 * IA d'abord (le métier visé), puis le code qui les sert. Renormalisée sur
 * les matières actives.
 */
export const STUDY_PLAN_WEIGHTS: Readonly<Record<string, number>> = {
  marketing: 30,
  ia: 25,
  python: 15,
  js: 15,
  html: 5,
  css: 5,
  secu: 5,
};

/** Minutes à faire aujourd'hui : l'objectif plus la dette. */
export function studyTarget(state: StudyState): number {
  return state.goalMinutes + state.debtMinutes;
}

function prune(history: Record<DayKey, number>, today: DayKey): Record<DayKey, number> {
  const out: Record<DayKey, number> = {};
  for (const [day, s] of Object.entries(history)) if (daysBetween(day, today) <= HISTORY_DAYS) out[day] = s;
  return out;
}

/**
 * Bilan des jours terminés, puis ouverture du jour. Idempotent ; un jour
 * ANTÉRIEUR au compteur (horloge reculée) ne change rien.
 */
export function settleStudy(progress: Progress, today: DayKey): Progress {
  const s = progress.study;
  if (s.day === today) return progress;
  if (s.day !== null && today < s.day) return progress;
  // Le compteur du dernier jour ouvert rejoint l'historique.
  const history = s.day === null ? { ...s.history } : { ...s.history, [s.day]: s.seconds };
  const yesterday = addDays(today, -1);
  // Première ouverture : rien à juger avant aujourd'hui.
  if (s.settledThrough === null) {
    return { ...progress, study: { ...s, day: today, seconds: 0, bySubject: {}, history: prune(history, today), settledThrough: yesterday } };
  }
  // Après la première ouverture, settledThrough est toujours renseigné.
  let from = addDays(s.settledThrough as DayKey, 1);
  const earliest = addDays(today, -MAX_SETTLED_DAYS);
  if (from < earliest) from = earliest;

  let debt = s.debtMinutes;
  let goalStreak = s.goalStreak;
  let gemsLost = 0;
  let missedDays = 0;
  let missingMinutes = 0;
  for (let d = from; d <= yesterday; d = addDays(d, 1)) {
    const done = Math.floor((history[d] ?? 0) / 60);
    const target = s.goalMinutes + debt;
    if (done >= target) {
      debt = 0;
      continue;
    }
    const missing = target - done;
    missedDays += 1;
    missingMinutes += missing;
    gemsLost += Math.min(MAX_DAY_PENALTY, Math.ceil((missing * 2) / 3));
    debt = Math.min(MAX_DEBT_MINUTES, debt + Math.ceil(missing / 3));
    goalStreak = 0;
  }
  const lost = Math.min(progress.gems, gemsLost);
  const report: StudyReport | null = missedDays > 0 ? { missedDays, missingMinutes, gemsLost: lost, debtMinutes: debt, streakLost: s.goalStreak > 0 && goalStreak === 0 ? s.goalStreak : 0 } : s.report;
  return {
    ...progress,
    gems: progress.gems - lost,
    study: { ...s, day: today, seconds: 0, bySubject: {}, history: prune(history, today), settledThrough: yesterday, debtMinutes: debt, goalStreak, report },
  };
}

export interface StudyCredit {
  progress: Progress;
  /** La moitié de l'objectif vient d'être atteinte. */
  halfReached: boolean;
  /** L'objectif vient d'être atteint. */
  goalReached: boolean;
  /** Gemmes gagnées par ce crédit (paliers compris). */
  gems: number;
}

/** Crédite du temps d'étude (plafonné par réponse) à une matière. */
export function creditStudy(progress: Progress, subjectId: string, seconds: number, today: DayKey): StudyCredit {
  const settled = settleStudy(progress, today);
  const add = Math.max(0, Math.min(MAX_SECONDS_PER_ANSWER, Math.round(seconds)));
  if (add === 0) return { progress: settled, halfReached: false, goalReached: false, gems: 0 };
  const s = settled.study;
  // Horloge reculée : le compteur reste sur le jour le plus récent.
  const day = s.day as DayKey;
  const total = s.seconds + add;
  const targetSeconds = studyTarget(s) * 60;
  const halfReached = total >= targetSeconds / 2 && s.halfOn !== day;
  const goalReached = total >= targetSeconds && s.metOn !== day;
  let gems = (halfReached ? STUDY_GEMS.half : 0) + (goalReached ? STUDY_GEMS.goal : 0);
  let goalStreak = s.goalStreak;
  let debtMinutes = s.debtMinutes;
  if (goalReached) {
    goalStreak += 1;
    gems += STUDY_GEMS.streakMilestones[goalStreak] ?? 0;
    debtMinutes = 0;
  }
  const study: StudyState = {
    ...s,
    seconds: total,
    bySubject: { ...s.bySubject, [subjectId]: (s.bySubject[subjectId] ?? 0) + add },
    halfOn: halfReached ? day : s.halfOn,
    metOn: goalReached ? day : s.metOn,
    goalStreak,
    bestGoalStreak: Math.max(s.bestGoalStreak, goalStreak),
    // L'objectif tenu efface la dette : le reste de la journée compte contre l'objectif seul.
    debtMinutes,
  };
  return { progress: { ...settled, gems: addGems(settled.gems, gems), study }, halfReached, goalReached, gems };
}

/** Change l'objectif quotidien (en minutes) ; la dette reste. */
export function setStudyGoal(progress: Progress, minutes: number): Progress {
  const goalMinutes = Math.max(10, Math.min(240, Math.round(minutes)));
  return { ...progress, study: { ...progress.study, goalMinutes } };
}

/** Le bilan affiché a été lu. */
export function acknowledgeStudyReport(progress: Progress): Progress {
  return progress.study.report === null ? progress : { ...progress, study: { ...progress.study, report: null } };
}

export interface PlanLine {
  subjectId: string;
  targetMinutes: number;
  doneMinutes: number;
}

/**
 * Le plan du jour : l'objectif (dette comprise) réparti entre les matières
 * actives selon STUDY_PLAN_WEIGHTS (1 pour une matière inconnue), dans
 * l'ordre des poids.
 */
export function studyPlan(state: StudyState, subjects: readonly string[]): PlanLine[] {
  const weight = (id: string) => STUDY_PLAN_WEIGHTS[id] ?? 1;
  const total = subjects.reduce((sum, id) => sum + weight(id), 0);
  if (total === 0) return [];
  const target = studyTarget(state);
  return [...subjects]
    .sort((a, b) => weight(b) - weight(a))
    .map((subjectId) => ({
      subjectId,
      targetMinutes: Math.max(1, Math.round((target * weight(subjectId)) / total)),
      doneMinutes: Math.floor((state.bySubject[subjectId] ?? 0) / 60),
    }));
}

/** La matière à travailler maintenant : la plus en retard sur son plan, ou null si tout est fait. */
export function nextPlannedSubject(plan: readonly PlanLine[]): string | null {
  let best: PlanLine | null = null;
  for (const line of plan) {
    if (line.doneMinutes >= line.targetMinutes) continue;
    const left = (line.targetMinutes - line.doneMinutes) / line.targetMinutes;
    const bestLeft = best === null ? -1 : (best.targetMinutes - best.doneMinutes) / best.targetMinutes;
    if (left > bestLeft) best = line;
  }
  return best === null ? null : best.subjectId;
}

/** Les 7 derniers jours (aujourd'hui compris), en minutes, du plus ancien au plus récent. */
export function lastWeekMinutes(state: StudyState, today: DayKey): { day: DayKey; minutes: number }[] {
  const out: { day: DayKey; minutes: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const seconds = day === state.day ? state.seconds : (state.history[day] ?? 0);
    out.push({ day, minutes: Math.floor(seconds / 60) });
  }
  return out;
}
