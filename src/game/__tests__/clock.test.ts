/**
 * Horloge qui recule (voyage vers l'ouest, réglage manuel) : rien ne doit
 * être rejugé ni payé deux fois.
 */

import { applyTick } from '../apply';
import { creditDailyXp, dailyRatio, ensureDaily, isGoalMet } from '../daily';
import { GEMS } from '../economy';
import { addLeagueXp, ensureLeague } from '../league';
import { MONTHLY_TARGET, emptyMonthly, ensureMonthly, recordMonthlyLesson } from '../monthly';
import { applyQuestEvent, ensureQuests } from '../quests';
import type { LeagueState } from '../types';
import { progressWith } from './fixtures';

const fresh: LeagueState = { tier: 0, weekKey: null, seed: 0, xpThisWeek: 0, pendingOutcome: null, history: [], rivalSeed: 0 };

describe('ligue', () => {
  it('ne rejuge pas une semaine quand le jour recule d’une semaine à l’autre', () => {
    let s = ensureLeague(fresh, '2026-09-09');
    s = addLeagueXp(s, 100000);
    const promoted = ensureLeague(s, '2026-09-14');
    expect(promoted.tier).toBe(1);
    // Le même jour réel, à New York : dimanche 13/09.
    const back = ensureLeague(promoted, '2026-09-13');
    expect(back).toBe(promoted);
    // Puis lundi 14/09 à New York : rien de plus.
    expect(ensureLeague(back, '2026-09-14')).toBe(promoted);
    expect(promoted.history).toHaveLength(1);
  });
});

describe('défi du mois', () => {
  it('ignore un mois antérieur', () => {
    const s = { ...emptyMonthly(), month: '2026-10', lessons: 1, claimed: false, medals: ['2026-09'] };
    expect(ensureMonthly(s, '2026-09-30')).toBe(s);
  });

  it('ne paie pas deux fois un mois déjà médaillé', () => {
    let s = emptyMonthly();
    for (let i = 0; i < MONTHLY_TARGET; i++) s = recordMonthlyLesson(s, '2026-09-14').state;
    expect(s.claimed).toBe(true);
    // Une leçon le 01/10, puis retour au 30/09 : le compteur reste sur octobre.
    s = recordMonthlyLesson(s, '2026-10-01').state;
    let paid = 0;
    for (let i = 0; i < MONTHLY_TARGET + 5; i++) {
      const r = recordMonthlyLesson(s, '2026-09-30');
      s = r.state;
      if (r.completed) paid += 1;
    }
    // Les leçons comptent pour octobre, qui peut être gagné une fois, septembre jamais deux fois.
    expect(s.month).toBe('2026-10');
    expect(paid).toBe(1);
    expect(s.medals).toEqual(['2026-09', '2026-10']);
  });

  it('garde « réclamé » un mois médaillé retrouvé plus tard', () => {
    const s = { ...emptyMonthly(), month: '2026-08', lessons: 3, claimed: false, medals: ['2026-09'] };
    expect(ensureMonthly(s, '2026-09-02').claimed).toBe(true);
  });
});

describe('quêtes et objectif du jour', () => {
  it('ne régénère pas les quêtes d’un jour antérieur', () => {
    const today = ensureQuests({ day: null, items: [] }, '2026-09-10');
    const done = applyQuestEvent(today, { kind: 'xp', amount: 1000 }).state;
    expect(ensureQuests(done, '2026-09-09')).toBe(done);
    expect(ensureQuests(done, '2026-09-10')).toBe(done);
  });

  it('ne rejoue pas l’objectif quand le jour recule puis revient', () => {
    let p = progressWith();
    let gems = 0;
    for (const day of ['2026-09-10', '2026-09-09', '2026-09-10']) {
      const r = creditDailyXp(p, p.daily.goal, day);
      p = r.progress;
      if (r.goalReached) gems += GEMS.dailyGoal;
    }
    expect(gems).toBe(GEMS.dailyGoal);
    expect(p.counters.goalDays).toBe(1);
    expect(p.daily.day).toBe('2026-09-10');
    expect(p.daily.metOn).toBe('2026-09-10');
  });

  it('ensureDaily, dailyRatio et isGoalMet suivent le jour le plus récent', () => {
    const d = { day: '2026-09-10', xp: 60, goal: 50, metOn: '2026-09-10', deckRewardedOn: null };
    expect(ensureDaily(d, '2026-09-09')).toBe(d);
    expect(dailyRatio(d, '2026-09-09')).toBe(1);
    expect(isGoalMet(d, '2026-09-09')).toBe(true);
    expect(isGoalMet(d, '2026-09-11')).toBe(false);
    expect(isGoalMet({ ...d, metOn: null }, '2026-09-10')).toBe(false);
  });

  it('applyTick ne remet rien à zéro quand l’horloge recule', () => {
    const later = applyTick(progressWith(), new Date(2026, 9, 1, 0, 30));
    const back = applyTick(later, new Date(2026, 8, 30, 23, 30));
    expect(back.quests).toBe(later.quests);
    expect(back.daily).toBe(later.daily);
    expect(back.monthly).toBe(later.monthly);
    expect(back.league).toBe(later.league);
  });
});
