import { DEFAULT_AD_POLICY, recordAdShown, recordSessionForAds, shouldShowAd } from '../ads';
import { applyAdShown } from '../apply';
import type { Progress } from '../types';
import { progressWith } from './fixtures';

const NOW = new Date('2026-09-09T19:30:00.000Z');

/** Un compte établi, éligible : 20 sessions, 3 depuis la dernière pub, il y a 1 h. */
function eligible(overrides: Partial<Progress> = {}): Progress {
  const base = progressWith();
  return {
    ...base,
    counters: { ...base.counters, sessionsCompleted: 20 },
    ads: { sessionsSinceLastAd: 3, lastAdAt: '2026-09-09T18:30:00.000Z', adsShown: 2 },
    ...overrides,
  };
}

const input = { mode: 'unit' as const, now: NOW, enabled: true };

describe('shouldShowAd', () => {
  it('dit oui à un compte établi, après une session d’unité, espacée', () => {
    expect(shouldShowAd(eligible(), input)).toBe(true);
  });

  it('dit toujours non quand le drapeau est éteint (v1)', () => {
    expect(shouldShowAd(eligible(), { ...input, enabled: false })).toBe(false);
  });

  it('ne suit que les sessions d’unité', () => {
    expect(shouldShowAd(eligible(), { ...input, mode: 'review' })).toBe(false);
    expect(shouldShowAd(eligible(), { ...input, mode: 'deck' })).toBe(false);
    expect(shouldShowAd(eligible(), { ...input, mode: 'free' })).toBe(false);
  });

  it('épargne les premières sessions d’un nouvel utilisateur', () => {
    const p = eligible();
    p.counters.sessionsCompleted = DEFAULT_AD_POLICY.graceSessions;
    expect(shouldShowAd(p, input)).toBe(false);
    p.counters.sessionsCompleted = DEFAULT_AD_POLICY.graceSessions + 1;
    expect(shouldShowAd(p, input)).toBe(true);
  });

  it('exige 3 sessions depuis la dernière pub', () => {
    const p = eligible();
    p.ads.sessionsSinceLastAd = 2;
    expect(shouldShowAd(p, input)).toBe(false);
  });

  it('exige 20 minutes depuis la dernière pub', () => {
    const p = eligible();
    p.ads.lastAdAt = '2026-09-09T19:15:00.000Z';
    expect(shouldShowAd(p, input)).toBe(false);
    p.ads.lastAdAt = '2026-09-09T19:10:00.000Z';
    expect(shouldShowAd(p, input)).toBe(true);
  });

  it('accepte un compte qui n’a encore jamais vu de pub', () => {
    const p = eligible();
    p.ads.lastAdAt = null;
    expect(shouldShowAd(p, input)).toBe(true);
  });

  it('accepte une politique sur mesure', () => {
    const p = eligible();
    p.ads.sessionsSinceLastAd = 1;
    const policy = { ...DEFAULT_AD_POLICY, minSessionsBetweenAds: 1 };
    expect(shouldShowAd(p, { ...input, policy })).toBe(true);
  });
});

describe('compteurs', () => {
  it('recordSessionForAds incrémente sans toucher au reste', () => {
    const ads = { sessionsSinceLastAd: 1, lastAdAt: null, adsShown: 0 };
    expect(recordSessionForAds(ads)).toEqual({ sessionsSinceLastAd: 2, lastAdAt: null, adsShown: 0 });
    expect(ads.sessionsSinceLastAd).toBe(1);
  });

  it('recordAdShown remet l’espacement à zéro et date la pub', () => {
    const ads = { sessionsSinceLastAd: 4, lastAdAt: null, adsShown: 0 };
    expect(recordAdShown(ads, NOW.toISOString())).toEqual({
      sessionsSinceLastAd: 0,
      lastAdAt: NOW.toISOString(),
      adsShown: 1,
    });
  });

  it('applyAdShown écrit dans la progression', () => {
    const p = applyAdShown(eligible(), NOW);
    expect(p.ads).toEqual({ sessionsSinceLastAd: 0, lastAdAt: NOW.toISOString(), adsShown: 3 });
    expect(shouldShowAd(p, input)).toBe(false);
  });
});
