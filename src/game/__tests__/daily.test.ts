import { applyAnswerAction, applyCardReview, applySessionEnd, applySetDailyGoal, applyUnlockAnimationPlayed } from '../apply';
import { creditDailyXp, dailyRatio, ensureDaily, isGoalMet } from '../daily';
import { GEMS } from '../economy';
import { DEFAULT_DAILY_GOAL } from '../types';
import { CATALOG, makeUnit, progressWith } from './fixtures';

const TODAY = '2026-09-09';
const AT_19H = new Date(2026, 8, 9, 19, 30);
const questions = makeUnit('seo-1', 4);

describe('ensureDaily / dailyRatio / isGoalMet', () => {
  it('remet à zéro quand le jour change, garde le même jour intact', () => {
    const d = { day: TODAY, xp: 30, goal: 50, metOn: null };
    expect(ensureDaily(d, TODAY)).toBe(d);
    expect(ensureDaily(d, '2026-09-10')).toEqual({ day: '2026-09-10', xp: 0, goal: 50, metOn: null });
    expect(dailyRatio(d, TODAY)).toBe(0.6);
    expect(dailyRatio({ ...d, xp: 80 }, TODAY)).toBe(1);
    expect(dailyRatio({ ...d, goal: 0 }, TODAY)).toBe(1);
    expect(isGoalMet({ ...d, metOn: TODAY }, TODAY)).toBe(true);
    expect(isGoalMet(d, TODAY)).toBe(false);
  });
});

describe('creditDailyXp', () => {
  it('cumule, atteint l’objectif une seule fois par jour et verse les gemmes', () => {
    let r = creditDailyXp(progressWith(), 30, TODAY);
    expect(r.goalReached).toBe(false);
    expect(r.progress.daily).toEqual({ day: TODAY, xp: 30, goal: DEFAULT_DAILY_GOAL, metOn: null });
    r = creditDailyXp(r.progress, 30, TODAY);
    expect(r.goalReached).toBe(true);
    expect(r.progress.gems).toBe(GEMS.dailyGoal);
    expect(r.progress.counters.goalDays).toBe(1);
    r = creditDailyXp(r.progress, 100, TODAY);
    expect(r.goalReached).toBe(false);
    expect(r.progress.gems).toBe(GEMS.dailyGoal);
    expect(r.progress.daily.xp).toBe(160);
  });

  it('ignore un montant nul et repart le lendemain', () => {
    const p = progressWith();
    expect(creditDailyXp(p, 0, TODAY).progress).toBe(p);
    const met = creditDailyXp(p, 60, TODAY).progress;
    const next = creditDailyXp(met, 60, '2026-09-10');
    expect(next.goalReached).toBe(true);
    expect(next.progress.counters.goalDays).toBe(2);
  });
});

describe('intégration', () => {
  it('une réponse et une carte nourrissent l’objectif', () => {
    const p = applySetDailyGoal(progressWith(), 15);
    const a = applyAnswerAction(p, { question: questions[0], correct: true, mode: 'unit', chrono: false, now: AT_19H, creditedThisSession: false });
    expect(a.goalReached).toBe(false);
    expect(a.progress.daily.xp).toBe(10);
    const c = applyCardReview(a.progress, { cardId: 'x', grade: 'good', now: AT_19H });
    expect(c.goalReached).toBe(true);
    expect(c.progress.daily.xp).toBe(15);
    expect(applyCardReview(c.progress, { cardId: 'y', grade: 'again', now: AT_19H }).goalReached).toBe(false);
  });

  it('le bonus de fin de session peut faire tomber l’objectif, et rend le ratio', () => {
    const p = applySetDailyGoal(progressWith(), 40);
    const r = applySessionEnd(p, {
      mode: 'unit', unitId: 'seo-1', questionCount: 10, correctCount: 10, chrono: false, now: AT_19H,
      questions, catalog: CATALOG, progressAtSessionStart: p,
    });
    expect(r.goalReached).toBe(true);
    expect(r.dailyRatio).toBe(1);
    expect(r.gemsGained).toBeGreaterThanOrEqual(GEMS.lesson + GEMS.perfect + GEMS.dailyGoal);
    const zero = applySetDailyGoal(r.progress, 0);
    expect(applySessionEnd(zero, { mode: 'review', unitId: null, questionCount: 3, correctCount: 3, chrono: false, now: AT_19H, questions, catalog: CATALOG, progressAtSessionStart: zero }).dailyRatio).toBe(1);
  });

  it('applySetDailyGoal borne à 1 minimum et arrondit', () => {
    expect(applySetDailyGoal(progressWith(), 0).daily.goal).toBe(1);
    expect(applySetDailyGoal(progressWith(), 99.6).daily.goal).toBe(100);
  });

  it('applyUnlockAnimationPlayed marque l’unité, connue ou non', () => {
    const p = applyUnlockAnimationPlayed(progressWith(), 'seo-2');
    expect(p.units['seo-2'].unlockAnimationPlayed).toBe(true);
    expect(applyUnlockAnimationPlayed(p, 'seo-2').units['seo-2'].unlockAnimationPlayed).toBe(true);
  });
});
