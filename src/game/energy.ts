/**
 * L'énergie — ce qui empêche de dévorer tout le contenu en un jour.
 *
 * 25 points au maximum. Une leçon (unité ou session libre) en coûte 5, une
 * erreur en coûte 1 de plus, un sans-faute en rembourse 2. Un point revient
 * toutes les 12 minutes (le plein en 5 h). Les révisions — file des erreurs
 * et deck — sont GRATUITES : quand on est à sec, on révise, on ne part pas.
 *
 * Rien n'est écrit par le temps qui passe : `currentEnergy` recalcule depuis
 * `updatedAt`, `settle` matérialise quand on modifie.
 */

import type { EnergyState, IsoDate, SessionMode } from './types';

export const MAX_ENERGY = 25;
export const ENERGY_REGEN_MINUTES = 12;
export const LESSON_ENERGY_COST = 5;
export const MISTAKE_ENERGY_COST = 1;
export const PERFECT_ENERGY_REFUND = 2;

const REGEN_MS = ENERGY_REGEN_MINUTES * 60 * 1000;

/** Les modes qui consomment de l'énergie. */
export function modeCostsEnergy(mode: SessionMode): boolean {
  return mode === 'unit' || mode === 'free';
}

/** Énergie disponible à l'instant `now`, régénération comprise, plafonnée. */
export function currentEnergy(state: EnergyState, now: Date): number {
  if (state.updatedAt === null) return MAX_ENERGY;
  if (state.value >= MAX_ENERGY) return MAX_ENERGY;
  const elapsed = Math.max(0, now.getTime() - Date.parse(state.updatedAt));
  return Math.min(MAX_ENERGY, state.value + Math.floor(elapsed / REGEN_MS));
}

/**
 * Matérialise la régénération. Le reste de période est conservé : à 11 min
 * d'un point, on ne repart pas de zéro parce qu'on a dépensé.
 */
export function settleEnergy(state: EnergyState, now: Date): EnergyState {
  if (state.updatedAt === null) return { value: MAX_ENERGY, updatedAt: now.toISOString() };
  const value = currentEnergy(state, now);
  if (value >= MAX_ENERGY) return { value: MAX_ENERGY, updatedAt: now.toISOString() };
  const regenerated = value - state.value;
  const carried: IsoDate = new Date(Date.parse(state.updatedAt) + regenerated * REGEN_MS).toISOString();
  return { value, updatedAt: carried };
}

export function canStartLesson(state: EnergyState, now: Date): boolean {
  return currentEnergy(state, now) >= LESSON_ENERGY_COST;
}

/** Dépense `amount`, jamais sous zéro. Une dépense depuis le plein démarre le compteur. */
export function spendEnergy(state: EnergyState, amount: number, now: Date): EnergyState {
  const settled = settleEnergy(state, now);
  const wasFull = settled.value >= MAX_ENERGY;
  return {
    value: Math.max(0, settled.value - amount),
    updatedAt: wasFull ? now.toISOString() : settled.updatedAt,
  };
}

export function refundEnergy(state: EnergyState, amount: number, now: Date): EnergyState {
  const settled = settleEnergy(state, now);
  const value = Math.min(MAX_ENERGY, settled.value + amount);
  return { value, updatedAt: value >= MAX_ENERGY ? now.toISOString() : settled.updatedAt };
}

export function refillEnergy(now: Date): EnergyState {
  return { value: MAX_ENERGY, updatedAt: now.toISOString() };
}

/** Minutes avant le prochain point ; 0 si plein. */
export function minutesToNextEnergy(state: EnergyState, now: Date): number {
  const settled = settleEnergy(state, now);
  if (settled.value >= MAX_ENERGY) return 0;
  const elapsed = now.getTime() - Date.parse(settled.updatedAt as string);
  return Math.max(1, Math.ceil((REGEN_MS - elapsed) / 60000));
}

/** Minutes avant de pouvoir lancer une leçon ; 0 si c'est déjà possible. */
export function minutesToLesson(state: EnergyState, now: Date): number {
  const value = currentEnergy(state, now);
  if (value >= LESSON_ENERGY_COST) return 0;
  const missing = LESSON_ENERGY_COST - value;
  return minutesToNextEnergy(state, now) + (missing - 1) * ENERGY_REGEN_MINUTES;
}
