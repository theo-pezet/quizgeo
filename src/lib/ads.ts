/**
 * Frontière avec le SDK publicitaire.
 *
 * En v1, aucun SDK n'est installé : l'implémentation est vide et rend
 * 'unavailable'. Quand AdMob sera branché (react-native-google-mobile-ads +
 * consentement UMP), seul ce fichier change. La RÈGLE d'affichage, elle, vit
 * dans src/game/ads.ts et est déjà testée.
 */

export type InterstitialOutcome = 'shown' | 'dismissed' | 'unavailable';
export type RewardedOutcome = 'rewarded' | 'dismissed' | 'unavailable';

export interface AdsAdapter {
  showInterstitial(): Promise<InterstitialOutcome>;
  showRewarded(): Promise<RewardedOutcome>;
}

export const ads: AdsAdapter = {
  async showInterstitial() {
    return 'unavailable';
  },
  async showRewarded() {
    return 'unavailable';
  },
};
