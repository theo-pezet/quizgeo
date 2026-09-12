/**
 * Le réducteur, côté boucle de rétention : énergie, gemmes, quêtes, ligue,
 * boost. Les quêtes sont posées à la main pour ne pas dépendre du tirage.
 */

import {
  applyAnswerAction,
  applyBuyRefill,
  applyCardReview,
  applyLeagueOutcomeSeen,
  applySessionEnd,
  applyStartLesson,
  applyTick,
} from '../apply';
import { GEMS, SHOP } from '../economy';
import { LESSON_ENERGY_COST, MAX_ENERGY } from '../energy';
import type { Progress, Quest, QuestKind, SessionMode } from '../types';
import { CATALOG, makeUnit, progressWith } from './fixtures';

const AT_19H = new Date(2026, 8, 9, 19, 30);
const TODAY = '2026-09-09';
const questions = makeUnit('seo-1', 4);

const quest = (kind: QuestKind, target: number, reward = 20): Quest => ({ id: kind, kind, target, progress: 0, reward, done: false });

function withQuests(p: Progress, items: Quest[]): Progress {
  return { ...p, quests: { day: TODAY, items } };
}

const answer = (p: Progress, correct: boolean, mode: SessionMode = 'unit') =>
  applyAnswerAction(p, { question: questions[0], correct, mode, chrono: false, now: AT_19H, creditedThisSession: false });

const end = (p: Progress, overrides: Partial<Parameters<typeof applySessionEnd>[1]> = {}) =>
  applySessionEnd(p, {
    mode: 'unit',
    unitId: 'seo-1',
    questionCount: 10,
    correctCount: 10,
    chrono: false,
    now: AT_19H,
    questions,
    catalog: CATALOG,
    progressAtSessionStart: p,
    ...overrides,
  });

describe('applyTick', () => {
  it('inscrit les quêtes du jour et la ligue de la semaine, et est idempotent', () => {
    const p = applyTick(progressWith(), AT_19H);
    expect(p.quests.day).toBe(TODAY);
    expect(p.quests.items).toHaveLength(3);
    expect(p.league.weekKey).toBe('2026-09-07');
    expect(p.energy.value).toBe(MAX_ENERGY);
    const again = applyTick(p, AT_19H);
    expect(again.quests).toBe(p.quests);
    expect(again.league).toBe(p.league);
  });
});

describe('applyStartLesson', () => {
  it('prélève 5 points pour une leçon, rien pour une révision', () => {
    const lesson = applyStartLesson(progressWith(), 'unit', AT_19H);
    expect(lesson?.energy.value).toBe(MAX_ENERGY - LESSON_ENERGY_COST);
    const review = applyStartLesson(progressWith(), 'review', AT_19H);
    expect(review?.energy.value).toBe(MAX_ENERGY);
  });

  it('refuse quand l’énergie manque', () => {
    const p = progressWith();
    p.energy = { value: 4, updatedAt: AT_19H.toISOString() };
    expect(applyStartLesson(p, 'free', AT_19H)).toBeNull();
  });
});

describe('applyAnswerAction — énergie, ligue, boost, quêtes', () => {
  it('fait payer une erreur en leçon, pas en révision', () => {
    const p = applyStartLesson(progressWith(), 'unit', AT_19H) as Progress;
    const wrong = answer(p, false);
    expect(wrong.energySpent).toBe(1);
    expect(wrong.progress.energy.value).toBe(MAX_ENERGY - LESSON_ENERGY_COST - 1);
    const right = answer(p, true);
    expect(right.energySpent).toBe(0);
    expect(answer(progressWith(), false, 'review').energySpent).toBe(0);
  });

  it('verse les XP à la ligue de la semaine', () => {
    const r = answer(progressWith(), true);
    expect(r.progress.league.xpThisWeek).toBe(10);
  });

  it('double les XP de réponse avec un boost actif', () => {
    const p = progressWith();
    p.boost = { activeUntil: new Date(AT_19H.getTime() + 60000).toISOString() };
    expect(answer(p, true).xpGained).toBe(20);
  });

  it('accomplit une quête XP et verse les gemmes', () => {
    const p = withQuests(progressWith(), [quest('xp', 10, 25)]);
    const r = answer(p, true);
    expect(r.questsCompleted.map((q) => q.kind)).toEqual(['xp']);
    expect(r.progress.gems).toBe(25);
    expect(r.progress.counters.questsCompleted).toBe(1);
  });

  it('compte une sortie de la file pour la quête « recover »', () => {
    let p = withQuests(progressWith(), [quest('recover', 1, 30)]);
    p = answer(p, false).progress;
    p = answer(p, true, 'review').progress;
    const r = answer(p, true, 'review');
    expect(r.leftQueue).toBe(true);
    expect(r.questsCompleted.map((q) => q.kind)).toEqual(['recover']);
    expect(r.progress.gems).toBe(30);
  });
});

describe('applySessionEnd — gemmes, énergie, quêtes, ligue', () => {
  it('paie une leçon comptée, davantage si sans faute, et rembourse 2 points', () => {
    const p = withQuests(applyStartLesson(progressWith(), 'unit', AT_19H) as Progress, []);
    const perfect = end(p);
    expect(perfect.gemsGained).toBe(GEMS.lesson + GEMS.perfect);
    expect(perfect.progress.gems).toBe(GEMS.lesson + GEMS.perfect);
    expect(perfect.energyRefunded).toBe(2);
    expect(perfect.progress.energy.value).toBe(MAX_ENERGY - LESSON_ENERGY_COST + 2);

    const ordinary = end(p, { correctCount: 7 });
    expect(ordinary.gemsGained).toBe(GEMS.lesson);
    expect(ordinary.energyRefunded).toBe(0);
  });

  it('ne paie rien pour une session trop courte, et 5 gemmes pour le deck', () => {
    expect(end(progressWith(), { mode: 'review', unitId: null, questionCount: 3, correctCount: 3 }).gemsGained).toBe(0);
    expect(end(progressWith(), { mode: 'deck', unitId: null, questionCount: 8, correctCount: 6 }).gemsGained).toBe(GEMS.deckSession);
    expect(end(progressWith(), { mode: 'review', unitId: null, questionCount: 8, correctCount: 6 }).gemsGained).toBe(0);
  });

  it('ajoute les gemmes du palier de série', () => {
    const p = progressWith();
    p.streak = { current: 6, best: 6, lastActiveDay: '2026-09-08', freezes: 0, freezeUsedOn: [] };
    const r = end(withQuests(p, []));
    expect(r.progress.streak.current).toBe(7);
    expect(r.gemsGained).toBe(GEMS.lesson + GEMS.perfect + 50);
  });

  it('verse le bonus de session à la ligue', () => {
    expect(end(progressWith()).progress.league.xpThisWeek).toBe(50);
  });

  it('fait avancer les quêtes leçon, sans-faute, combo et XP', () => {
    const p = withQuests(progressWith(), [quest('lessons', 1, 10), quest('perfect', 1, 40), quest('combo', 5, 20), quest('xp', 50, 30)]);
    const r = end(p, { bestCombo: 6 });
    expect(r.questsCompleted.map((q) => q.kind).sort()).toEqual(['combo', 'lessons', 'perfect', 'xp']);
    expect(r.gemsGained).toBe(GEMS.lesson + GEMS.perfect + 10 + 40 + 20 + 30);
    expect(r.progress.counters.questsCompleted).toBe(4);
  });

  it('ne compte pas une révision comme une leçon pour les quêtes', () => {
    const p = withQuests(progressWith(), [quest('lessons', 1, 10)]);
    const r = end(p, { mode: 'review', unitId: null, correctCount: 8 });
    expect(r.questsCompleted).toEqual([]);
  });
});

describe('applyCardReview — quêtes et ligue', () => {
  it('compte la carte, les XP, et double avec un boost', () => {
    const p = withQuests(progressWith(), [quest('cards', 1, 15), quest('xp', 10, 20)]);
    p.boost = { activeUntil: new Date(AT_19H.getTime() + 60000).toISOString() };
    const r = applyCardReview(p, { cardId: 'c', grade: 'good', now: AT_19H });
    expect(r.xpGained).toBe(10);
    expect(r.progress.league.xpThisWeek).toBe(10);
    expect(r.questsCompleted.map((q) => q.kind)).toEqual(['cards', 'xp']);
    expect(r.progress.gems).toBe(35);
  });

  it('ne fait pas avancer la quête XP sur « Encore »', () => {
    const p = withQuests(progressWith(), [quest('xp', 5, 20)]);
    const r = applyCardReview(p, { cardId: 'c', grade: 'again', now: AT_19H });
    expect(r.questsCompleted).toEqual([]);
  });
});

describe('boutique et ligue', () => {
  it('applyBuyRefill recharge contre des gemmes, ou refuse', () => {
    const p = progressWith();
    p.gems = SHOP.refill.cost;
    p.energy = { value: 2, updatedAt: AT_19H.toISOString() };
    const r = applyBuyRefill(p, AT_19H);
    expect(r?.energy.value).toBe(MAX_ENERGY);
    expect(r?.gems).toBe(0);
    expect(applyBuyRefill(r as Progress, AT_19H)).toBeNull();
  });

  it('applyLeagueOutcomeSeen efface le bilan en attente', () => {
    const p = progressWith();
    p.league.pendingOutcome = { weekKey: '2026-08-31', tier: 0, rank: 3, result: 'promoted', newTier: 1 };
    expect(applyLeagueOutcomeSeen(p).league.pendingOutcome).toBeNull();
  });
});
