/**
 * L'énergie — ce qui empêche de dévorer tout le contenu en un jour.
 *
 * 30 points au maximum, plus un bonus lié à la ligue actuelle
 * (leagueEnergyBonus : +10 en Or, +30 au Diamant ; perdu en cas de relégation). Une leçon
 * (unité ou session libre) en coûte 5, une erreur en coûte 1 de plus, un
 * sans-faute en rembourse 2. Un point revient toutes les 12 minutes. Les révisions — file des erreurs
 * et deck — sont GRATUITES : quand on est à sec, on révise, on ne part pas.
 *
 * Rien n'est écrit par le temps qui passe : `currentEnergy` recalcule depuis
 * `updatedAt`, `settle` matérialise quand on modifie.
 */

import { leagueEnergyBonus } from './league';
import type { EnergyState, IsoDate, LeagueState, SessionMode } from './types';

/** Le plafond de base, sans bonus de ligue. */
export const MAX_ENERGY = 30;
export const ENERGY_REGEN_MINUTES = 12;
export const LESSON_ENERGY_COST = 5;
export const MISTAKE_ENERGY_COST = 1;
export const PERFECT_ENERGY_REFUND = 2;

const REGEN_MS = ENERGY_REGEN_MINUTES * 60 * 1000;

/**
 * Le plafond d'énergie d'un joueur : la base plus le bonus de sa ligue
 * ACTUELLE. Une relégation le fait redescendre : le bonus se défend.
 */
export function maxEnergyFor(league: Pick<LeagueState, 'tier'>): number {
  return MAX_ENERGY + leagueEnergyBonus(league.tier);
}

/** Les modes qui consomment de l'énergie. */
export function modeCostsEnergy(mode: SessionMode): boolean {
  return mode === 'unit' || mode === 'free';
}

/** Énergie disponible à l'instant `now`, régénération comprise, plafonnée. */
export function currentEnergy(state: EnergyState, now: Date, max: number = MAX_ENERGY): number {
  if (state.updatedAt === null) return max;
  if (state.value >= max) return max;
  const elapsed = Math.max(0, now.getTime() - Date.parse(state.updatedAt));
  return Math.min(max, state.value + Math.floor(elapsed / REGEN_MS));
}

/**
 * Matérialise la régénération. Le reste de période est conservé : à 11 min
 * d'un point, on ne repart pas de zéro parce qu'on a dépensé.
 */
export function settleEnergy(state: EnergyState, now: Date, max: number = MAX_ENERGY): EnergyState {
  if (state.updatedAt === null) return { value: max, updatedAt: now.toISOString() };
  const value = currentEnergy(state, now, max);
  if (value >= max) return { value: max, updatedAt: now.toISOString() };
  const regenerated = value - state.value;
  const carried: IsoDate = new Date(Date.parse(state.updatedAt) + regenerated * REGEN_MS).toISOString();
  return { value, updatedAt: carried };
}

export function canStartLesson(state: EnergyState, now: Date, max: number = MAX_ENERGY): boolean {
  return currentEnergy(state, now, max) >= LESSON_ENERGY_COST;
}

/** Dépense `amount`, jamais sous zéro. Une dépense depuis le plein démarre le compteur. */
export function spendEnergy(state: EnergyState, amount: number, now: Date, max: number = MAX_ENERGY): EnergyState {
  const settled = settleEnergy(state, now, max);
  const wasFull = settled.value >= max;
  return {
    value: Math.max(0, settled.value - amount),
    updatedAt: wasFull ? now.toISOString() : settled.updatedAt,
  };
}

export function refundEnergy(state: EnergyState, amount: number, now: Date, max: number = MAX_ENERGY): EnergyState {
  const settled = settleEnergy(state, now, max);
  const value = Math.min(max, settled.value + amount);
  return { value, updatedAt: value >= max ? now.toISOString() : settled.updatedAt };
}

export function refillEnergy(now: Date, max: number = MAX_ENERGY): EnergyState {
  return { value: max, updatedAt: now.toISOString() };
}

/** Minutes avant le prochain point ; 0 si plein. */
export function minutesToNextEnergy(state: EnergyState, now: Date, max: number = MAX_ENERGY): number {
  const settled = settleEnergy(state, now, max);
  if (settled.value >= max) return 0;
  const elapsed = now.getTime() - Date.parse(settled.updatedAt as string);
  return Math.max(1, Math.ceil((REGEN_MS - elapsed) / 60000));
}

/** Minutes avant de pouvoir lancer une leçon ; 0 si c'est déjà possible. */
export function minutesToLesson(state: EnergyState, now: Date, max: number = MAX_ENERGY): number {
  const value = currentEnergy(state, now, max);
  if (value >= LESSON_ENERGY_COST) return 0;
  const missing = LESSON_ENERGY_COST - value;
  return minutesToNextEnergy(state, now, max) + (missing - 1) * ENERGY_REGEN_MINUTES;
}
