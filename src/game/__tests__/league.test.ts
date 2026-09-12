import {
  DEMOTION_ZONE,
  LEAGUE_SIZE,
  LEAGUE_TIERS,
  MAX_HISTORY,
  PROMOTION_ZONE,
  addLeagueXp,
  clearLeagueOutcome,
  daysLeftInWeek,
  ensureLeague,
  leagueStandings,
  resultForRank,
  userRank,
  weekKeyOf,
} from '../league';
import type { LeagueState } from '../types';

const MONDAY = '2026-09-07';
const fresh: LeagueState = { tier: 0, weekKey: null, seed: 0, xpThisWeek: 0, pendingOutcome: null, history: [] };

describe('weekKeyOf', () => {
  it('rend le lundi de la semaine', () => {
    expect(weekKeyOf('2026-09-07')).toBe(MONDAY);
    expect(weekKeyOf('2026-09-09')).toBe(MONDAY);
    expect(weekKeyOf('2026-09-13')).toBe(MONDAY);
    expect(weekKeyOf('2026-09-14')).toBe('2026-09-14');
  });
});

describe('ensureLeague', () => {
  it('inscrit dans la semaine courante la première fois', () => {
    const s = ensureLeague(fresh, '2026-09-09');
    expect(s.weekKey).toBe(MONDAY);
    expect(s.seed).not.toBe(0);
    expect(s.pendingOutcome).toBeNull();
    expect(ensureLeague(s, '2026-09-12')).toBe(s);
    expect(daysLeftInWeek(fresh, '2026-09-09')).toBe(7);
    expect(daysLeftInWeek(s, '2026-09-09')).toBe(5);
    expect(daysLeftInWeek(s, '2026-09-30')).toBe(0);
  });

  it('juge la semaine écoulée et promeut un joueur en tête', () => {
    let s = ensureLeague(fresh, '2026-09-09');
    s = addLeagueXp(s, 100000);
    const next = ensureLeague(s, '2026-09-14');
    expect(next.weekKey).toBe('2026-09-14');
    expect(next.xpThisWeek).toBe(0);
    expect(next.tier).toBe(1);
    expect(next.pendingOutcome).toEqual({ weekKey: MONDAY, tier: 0, rank: 1, result: 'promoted', newTier: 1 });
    expect(next.history).toHaveLength(1);
    expect(next.seed).not.toBe(s.seed);
  });

  it('ne relègue pas sous Bronze, et garde sa place hors des zones', () => {
    const s = ensureLeague(fresh, '2026-09-09'); // 0 XP : dernier
    const next = ensureLeague(s, '2026-09-14');
    expect(next.pendingOutcome?.result).toBe('stayed');
    expect(next.tier).toBe(0);
    expect(userRank(s, '2026-09-13')).toBe(LEAGUE_SIZE);
  });

  it('relègue un joueur inactif d’une division supérieure', () => {
    const s = ensureLeague({ ...fresh, tier: 3 }, '2026-09-09');
    const next = ensureLeague(s, '2026-09-21');
    expect(next.pendingOutcome?.result).toBe('demoted');
    expect(next.tier).toBe(2);
  });

  it('plafonne l’historique', () => {
    let s = ensureLeague(fresh, '2026-09-09');
    for (let week = 1; week <= MAX_HISTORY + 3; week += 1) {
      const day = new Date(Date.UTC(2026, 8, 7 + 7 * week)).toISOString().slice(0, 10);
      s = ensureLeague(s, day);
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
  });
});

describe('resultForRank', () => {
  it('applique les zones et les bornes de division', () => {
    expect(resultForRank(PROMOTION_ZONE, 0)).toBe('promoted');
    expect(resultForRank(PROMOTION_ZONE + 1, 0)).toBe('stayed');
    expect(resultForRank(LEAGUE_SIZE - DEMOTION_ZONE + 1, 1)).toBe('demoted');
    expect(resultForRank(LEAGUE_SIZE - DEMOTION_ZONE, 1)).toBe('stayed');
    expect(resultForRank(1, LEAGUE_TIERS.length - 1)).toBe('stayed');
    expect(resultForRank(LEAGUE_SIZE, 0)).toBe('stayed');
  });
});

describe('leagueStandings', () => {
  it('rend 30 joueurs triés, l’utilisateur inclus, de façon reproductible', () => {
    const s = addLeagueXp(ensureLeague(fresh, '2026-09-09'), 250);
    const a = leagueStandings(s, '2026-09-10');
    const b = leagueStandings(s, '2026-09-10');
    expect(a).toEqual(b);
    expect(a).toHaveLength(LEAGUE_SIZE);
    expect(a.filter((c) => c.isUser)).toHaveLength(1);
    expect(a.find((c) => c.isUser)?.xp).toBe(250);
    for (let i = 1; i < a.length; i += 1) expect(a[i - 1].xp).toBeGreaterThanOrEqual(a[i].xp);
    expect(new Set(a.map((c) => c.name)).size).toBe(LEAGUE_SIZE);
  });

  it('fait progresser les adversaires au fil de la semaine, sans dépasser 7 jours', () => {
    const s = ensureLeague(fresh, '2026-09-07');
    const total = (day: string) => leagueStandings(s, day).filter((c) => !c.isUser).reduce((sum, c) => sum + c.xp, 0);
    expect(total('2026-09-07')).toBeLessThan(total('2026-09-10'));
    expect(total('2026-09-10')).toBeLessThan(total('2026-09-13'));
    expect(total('2026-09-13')).toBe(total('2026-09-20'));
    expect(total('2026-09-01')).toBe(total('2026-09-07'));
  });

  it('place l’utilisateur devant à XP égal', () => {
    const s = ensureLeague(fresh, '2026-09-07');
    const rival = leagueStandings(s, '2026-09-07').find((c) => !c.isUser) as { xp: number };
    const tied = addLeagueXp(s, rival.xp);
    const standings = leagueStandings(tied, '2026-09-07');
    const userIndex = standings.findIndex((c) => c.isUser);
    expect(standings[userIndex + 1]?.xp ?? 0).toBeLessThanOrEqual(rival.xp);
    if (userIndex > 0) expect(standings[userIndex - 1].xp).toBeGreaterThan(rival.xp);
  });

  it('gère une ligue jamais inscrite et un adversaire sans XP', () => {
    expect(leagueStandings(fresh, '2026-09-09')).toHaveLength(LEAGUE_SIZE);
    expect(userRank(fresh, '2026-09-09')).toBe(LEAGUE_SIZE);
  });

  it('accélère dans les divisions hautes', () => {
    const low = ensureLeague(fresh, '2026-09-07');
    const high = ensureLeague({ ...fresh, tier: 9 }, '2026-09-07');
    const sum = (s: LeagueState) => leagueStandings(s, '2026-09-13').filter((c) => !c.isUser).reduce((a, c) => a + c.xp, 0);
    expect(sum(high)).toBeGreaterThan(sum(low) * 3);
  });
});

describe('divers', () => {
  it('addLeagueXp ignore les négatifs, clearLeagueOutcome efface le bilan', () => {
    expect(addLeagueXp(fresh, -5).xpThisWeek).toBe(0);
    const withOutcome: LeagueState = {
      ...fresh,
      pendingOutcome: { weekKey: MONDAY, tier: 0, rank: 1, result: 'promoted', newTier: 1 },
    };
    expect(clearLeagueOutcome(withOutcome).pendingOutcome).toBeNull();
  });

  it('a 10 divisions', () => {
    expect(LEAGUE_TIERS).toHaveLength(10);
  });
});
