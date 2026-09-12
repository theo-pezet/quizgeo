/**
 * Les gemmes — la monnaie — et ce qu'on en fait.
 *
 * Gagnées en jouant (leçon, sans-faute, quêtes, paliers de série, deck),
 * dépensées en confort : recharge d'énergie, gel de série, boost d'XP.
 * Plus tard, une pub récompensée pourra en donner ; ce module n'a pas à
 * le savoir.
 */

import { MAX_FREEZES } from './streak';
import type { BoostState, IsoDate, Progress } from './types';

export const GEMS = {
  lesson: 10,
  perfect: 20,
  deckSession: 5,
  streakMilestones: { 7: 50, 30: 200, 100: 500 } as Record<number, number>,
} as const;

export const SHOP = {
  refill: { cost: 150 },
  freeze: { cost: 200 },
  boost: { cost: 100, minutes: 15 },
} as const;

export const BOOST_MULTIPLIER = 2;

export function addGems(gems: number, amount: number): number {
  return Math.max(0, gems) + Math.max(0, amount);
}

/** Rend le nouveau solde, ou null si on ne peut pas payer. */
export function spendGems(gems: number, cost: number): number | null {
  if (gems < cost) return null;
  return gems - cost;
}

export function streakMilestoneGems(current: number): number {
  return GEMS.streakMilestones[current] ?? 0;
}

export function boostActive(boost: BoostState, now: Date): boolean {
  return boost.activeUntil !== null && Date.parse(boost.activeUntil) > now.getTime();
}

export function boostMinutesLeft(boost: BoostState, now: Date): number {
  if (!boostActive(boost, now)) return 0;
  return Math.ceil((Date.parse(boost.activeUntil as string) - now.getTime()) / 60000);
}

export function xpMultiplier(boost: BoostState, now: Date): number {
  return boostActive(boost, now) ? BOOST_MULTIPLIER : 1;
}

/** Achat d'un gel de série. Null si trop pauvre ou déjà au maximum. */
export function buyFreeze(progress: Progress): Progress | null {
  if (progress.streak.freezes >= MAX_FREEZES) return null;
  const gems = spendGems(progress.gems, SHOP.freeze.cost);
  if (gems === null) return null;
  return { ...progress, gems, streak: { ...progress.streak, freezes: progress.streak.freezes + 1 } };
}

/** Achat d'un boost : prolonge s'il en reste un en cours. */
export function buyBoost(progress: Progress, now: Date): Progress | null {
  const gems = spendGems(progress.gems, SHOP.boost.cost);
  if (gems === null) return null;
  const from = boostActive(progress.boost, now) ? Date.parse(progress.boost.activeUntil as string) : now.getTime();
  const activeUntil: IsoDate = new Date(from + SHOP.boost.minutes * 60000).toISOString();
  return { ...progress, gems, boost: { activeUntil } };
}
