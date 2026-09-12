/**
 * Politique d'affichage des publicités — la RÈGLE, pas le SDK.
 *
 * Le SDK (AdMob) vit derrière src/lib/ads.ts et n'est pas installé en v1.
 * Ici on ne décide que d'une chose : après cette session, a-t-on le droit de
 * montrer un interstitiel ? La réponse est calculée depuis l'état persisté,
 * donc testable, et elle ne dépend pas de l'écran.
 *
 * Principes : jamais pendant un exercice, seulement en fin de session
 * d'unité ; jamais sur les premières sessions d'un nouvel utilisateur ;
 * jamais deux sessions d'affilée ; un espacement minimal en sessions ET en
 * minutes.
 */

import type { AdsState, IsoDate, Progress, SessionMode } from './types';

export interface AdPolicy {
  /** Les N premières sessions de la vie du compte ne montrent jamais de pub. */
  graceSessions: number;
  /** Sessions terminées depuis la dernière pub, minimum. */
  minSessionsBetweenAds: number;
  /** Minutes depuis la dernière pub, minimum. */
  minMinutesBetweenAds: number;
  /** Seuls ces modes de session peuvent être suivis d'une pub. */
  modes: readonly SessionMode[];
}

export const DEFAULT_AD_POLICY: AdPolicy = {
  graceSessions: 5,
  minSessionsBetweenAds: 3,
  minMinutesBetweenAds: 20,
  modes: ['unit'],
};

export interface AdDecisionInput {
  mode: SessionMode;
  now: Date;
  /** Le drapeau global (FEATURES.ads). Faux en v1 : la réponse est toujours non. */
  enabled: boolean;
  policy?: AdPolicy;
}

/** Faut-il proposer un interstitiel après la session qui vient de se terminer ? */
export function shouldShowAd(progress: Progress, input: AdDecisionInput): boolean {
  const policy = input.policy ?? DEFAULT_AD_POLICY;
  if (!input.enabled) return false;
  if (!policy.modes.includes(input.mode)) return false;
  if (progress.counters.sessionsCompleted <= policy.graceSessions) return false;
  if (progress.ads.sessionsSinceLastAd < policy.minSessionsBetweenAds) return false;
  if (progress.ads.lastAdAt !== null) {
    const elapsedMinutes = (input.now.getTime() - Date.parse(progress.ads.lastAdAt)) / 60000;
    if (elapsedMinutes < policy.minMinutesBetweenAds) return false;
  }
  return true;
}

/** À appeler à chaque fin de session, quelle qu'elle soit. */
export function recordSessionForAds(ads: AdsState): AdsState {
  return { ...ads, sessionsSinceLastAd: ads.sessionsSinceLastAd + 1 };
}

/** À appeler quand une pub a effectivement été affichée (pas seulement décidée). */
export function recordAdShown(ads: AdsState, now: IsoDate): AdsState {
  return { sessionsSinceLastAd: 0, lastAdAt: now, adsShown: ads.adsShown + 1 };
}
