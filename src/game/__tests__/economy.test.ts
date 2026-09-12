import {
  BOOST_MULTIPLIER,
  SHOP,
  addGems,
  boostActive,
  boostMinutesLeft,
  buyBoost,
  buyFreeze,
  spendGems,
  streakMilestoneGems,
  xpMultiplier,
} from '../economy';
import { MAX_FREEZES } from '../streak';
import { progressWith } from './fixtures';

const NOW = new Date('2026-09-09T10:00:00.000Z');

describe('gemmes', () => {
  it('addGems ignore les négatifs', () => {
    expect(addGems(10, 5)).toBe(15);
    expect(addGems(-3, -3)).toBe(0);
  });

  it('spendGems refuse un solde insuffisant', () => {
    expect(spendGems(100, 100)).toBe(0);
    expect(spendGems(99, 100)).toBeNull();
  });

  it('paie les paliers de série', () => {
    expect(streakMilestoneGems(7)).toBe(50);
    expect(streakMilestoneGems(30)).toBe(200);
    expect(streakMilestoneGems(8)).toBe(0);
  });
});

describe('boost', () => {
  it('est inactif sans date ou après expiration', () => {
    expect(boostActive({ activeUntil: null }, NOW)).toBe(false);
    expect(boostActive({ activeUntil: '2026-09-09T09:59:00.000Z' }, NOW)).toBe(false);
    expect(xpMultiplier({ activeUntil: null }, NOW)).toBe(1);
    expect(boostMinutesLeft({ activeUntil: null }, NOW)).toBe(0);
  });

  it('double les XP tant qu’il court', () => {
    const boost = { activeUntil: '2026-09-09T10:10:00.000Z' };
    expect(xpMultiplier(boost, NOW)).toBe(BOOST_MULTIPLIER);
    expect(boostMinutesLeft(boost, NOW)).toBe(10);
  });

  it('buyBoost débite et prolonge un boost en cours', () => {
    const p = { ...progressWith(), gems: SHOP.boost.cost * 2 };
    const first = buyBoost(p, NOW);
    expect(first?.gems).toBe(SHOP.boost.cost);
    expect(first?.boost.activeUntil).toBe('2026-09-09T10:15:00.000Z');
    const second = buyBoost(first as never, new Date('2026-09-09T10:05:00.000Z'));
    expect(second?.boost.activeUntil).toBe('2026-09-09T10:30:00.000Z');
    expect(buyBoost(second as never, NOW)).toBeNull();
  });
});

describe('buyFreeze', () => {
  it('ajoute un gel contre des gemmes', () => {
    const p = { ...progressWith(), gems: SHOP.freeze.cost };
    const r = buyFreeze(p);
    expect(r?.gems).toBe(0);
    expect(r?.streak.freezes).toBe(1);
  });

  it('refuse sans gemmes ou au maximum de gels', () => {
    expect(buyFreeze(progressWith())).toBeNull();
    const full = { ...progressWith(), gems: 1000 };
    full.streak.freezes = MAX_FREEZES;
    expect(buyFreeze(full)).toBeNull();
  });
});
