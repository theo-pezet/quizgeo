/**
 * Correctifs d'avant lancement : pas de farm d'XP ni de gemmes par le deck ou
 * la file « à revoir », erreurs de leçon distinctes des révisions, recharge
 * inutile refusée, Blitz sans coût d'erreur, test de sortie, minuit.
 */

import {
  applyAnswerAction,
  applyBuyRefill,
  applyCardLapse,
  applyCardReview,
  applySessionEnd,
  type SessionEndAction,
} from '../apply';
import { GEMS, SHOP } from '../economy';
import { MAX_ENERGY } from '../energy';
import { allUnitTraits, isUnitUnlocked, unitTraits } from '../mastery';
import type { Grade } from '../srs';
import type { Progress, Quest } from '../types';
import { CATALOG, makeFullBank, makeUnit, progressWith } from './fixtures';

const AT_19H = new Date(2026, 8, 9, 19, 30);
const TODAY = '2026-09-09';
const bank = makeFullBank();
const CARD_IDS = Array.from({ length: 10 }, (_, i) => `card-${i}`);

/** Objectif du jour hors de portée, quêtes posées à la main. */
function base(items: Quest[] = []): Progress {
  const p = progressWith();
  return { ...p, quests: { day: TODAY, items }, daily: { ...p.daily, day: TODAY, goal: 100000 } };
}

/** Une session de deck complète : chaque carte notée `grade`, puis la fin de session. */
function deckSession(p: Progress, grade: Grade, now = AT_19H) {
  const start = p;
  let progress = p;
  let xp = 0;
  for (const cardId of CARD_IDS) {
    const r = applyCardReview(progress, { cardId, grade, now });
    progress = r.progress;
    xp += r.xpGained;
  }
  const correct = grade === 'again' ? 0 : CARD_IDS.length;
  const end = applySessionEnd(progress, {
    mode: 'deck',
    unitId: null,
    questionCount: CARD_IDS.length,
    correctCount: correct,
    chrono: false,
    now,
    questions: bank,
    catalog: CATALOG,
    progressAtSessionStart: start,
  });
  return { progress: end.progress, xp: xp + end.xpGained, gems: end.gemsGained, bonus: end.xpGained };
}

describe('deck : pas de farm en boucle', () => {
  it('la première session du jour rapporte XP, bonus et gemmes', () => {
    const r = deckSession(base(), 'hard');
    expect(r.xp).toBe(10 * 5 + 20 + 30);
    expect(r.gems).toBe(GEMS.deckSession);
    expect(r.progress.daily.deckRewardedOn).toBe(TODAY);
  });

  it('relancer 20 fois le deck en « Difficile » ne rapporte plus rien', () => {
    let p = deckSession(base(), 'hard').progress;
    const xpAfterFirst = p.xp;
    const gemsAfterFirst = p.gems;
    for (let i = 0; i < 20; i += 1) p = deckSession(p, 'hard').progress;
    expect(p.xp).toBe(xpAfterFirst);
    expect(p.gems).toBe(gemsAfterFirst);
    expect(p.league.xpThisWeek).toBe(xpAfterFirst);
    // Les révisions restent comptées comme telles.
    expect(p.counters.cardsReviewed).toBe(21 * CARD_IDS.length);
  });

  it('le lendemain, les cartes dues rapportent de nouveau', () => {
    const p = deckSession(base(), 'hard').progress;
    const next = deckSession(p, 'good', new Date(2026, 8, 10, 19, 30));
    expect(next.xp).toBe(10 * 5 + 20 + 30);
    expect(next.gems).toBe(GEMS.deckSession);
  });

  it('les gemmes du deck tombent une fois par jour, même avec des cartes neuves', () => {
    const first = deckSession(base(), 'good');
    // Dix autres cartes, neuves : XP et bonus, mais plus de gemmes.
    const others = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5'];
    let p = first.progress;
    const start = p;
    for (const cardId of others) p = applyCardReview(p, { cardId, grade: 'good', now: AT_19H }).progress;
    const end = applySessionEnd(p, {
      mode: 'deck', unitId: null, questionCount: 6, correctCount: 6, chrono: false, now: AT_19H,
      questions: bank, catalog: CATALOG, progressAtSessionStart: start,
    });
    expect(end.xpGained).toBe(20);
    expect(end.gemsGained).toBe(0);
  });

  it('une session ratée (« Encore » partout) ne rapporte ni bonus ni gemmes', () => {
    const r = deckSession(base(), 'again');
    expect(r.xp).toBe(0);
    expect(r.gems).toBe(0);
  });

  it('la quête « Réviser N cartes » ne compte qu’une révision par carte et par jour', () => {
    const quest: Quest = { id: 'cards', kind: 'cards', target: 20, progress: 0, reward: 30, done: false };
    let p = deckSession(base([quest]), 'hard').progress;
    p = deckSession(p, 'hard').progress;
    expect(p.quests.items[0].progress).toBe(10);
    expect(p.quests.items[0].done).toBe(false);
  });

  it('une date de révision dans le futur (horloge reculée) ne compte pas comme un autre jour', () => {
    let p = base();
    p = applyCardReview(p, { cardId: 'c', grade: 'good', now: new Date(2026, 8, 10, 10, 0) }).progress;
    const back = applyCardReview(p, { cardId: 'c', grade: 'good', now: AT_19H });
    expect(back.xpGained).toBe(0);
  });
});

describe('file « à revoir » : pas de bonus sur des erreurs volontaires', () => {
  const review = (correctCount: number, questionCount = 5) =>
    applySessionEnd(base(), {
      mode: 'review', unitId: null, questionCount, correctCount, chrono: false, now: AT_19H,
      questions: bank, catalog: CATALOG, progressAtSessionStart: base(),
    });

  it('5 réponses fausses ne rapportent plus 20 XP', () => {
    expect(review(0).xpGained).toBe(0);
    expect(review(4).xpGained).toBe(0);
  });

  it('5 bonnes réponses ou plus gardent le bonus', () => {
    expect(review(5).xpGained).toBe(20);
    expect(review(10, 10).xpGained).toBe(50);
  });
});

describe('pont leçon → deck', () => {
  it('applyCardLapse replanifie la carte sans compter de révision, de quête ni d’XP', () => {
    const quest: Quest = { id: 'cards', kind: 'cards', target: 10, progress: 0, reward: 30, done: false };
    let p = base([quest]);
    for (let i = 0; i < 10; i += 1) p = applyCardLapse(p, `card-${i}`, AT_19H);
    expect(p.counters.cardsReviewed).toBe(0);
    expect(p.quests.items[0].progress).toBe(0);
    expect(p.xp).toBe(0);
    expect(p.gems).toBe(0);
    expect(p.cards['card-0'].due).toBe(TODAY);
    expect(p.cards['card-0'].phase).toBe('learning');
    expect(p.cards['card-0'].lastReviewedAt).toBeNull();
  });

  it('une carte replanifiée par une erreur rapporte encore au deck le jour même', () => {
    let p = applyCardReview(base(), { cardId: 'c', grade: 'good', now: new Date(2026, 8, 5, 10, 0) }).progress;
    p = applyCardLapse(p, 'c', AT_19H);
    expect(p.cards.c.lastReviewedAt).toBe(new Date(2026, 8, 5, 10, 0).toISOString());
    expect(applyCardReview(p, { cardId: 'c', grade: 'good', now: AT_19H }).xpGained).toBe(5);
  });
});

describe('recharge d’énergie', () => {
  it('refuse l’achat quand l’énergie est déjà pleine', () => {
    const p = { ...progressWith(), gems: 150 };
    expect(applyBuyRefill(p, AT_19H)).toBeNull();
    p.energy = { value: MAX_ENERGY, updatedAt: AT_19H.toISOString() };
    expect(applyBuyRefill(p, AT_19H)).toBeNull();
  });

  it('refuse toujours l’achat sans assez de gemmes', () => {
    const p = { ...progressWith(), gems: SHOP.refill.cost - 1, energy: { value: 0, updatedAt: AT_19H.toISOString() } };
    expect(applyBuyRefill(p, AT_19H)).toBeNull();
  });

  it('l’accepte dès qu’il manque un point', () => {
    const p = { ...progressWith(), gems: 150, energy: { value: MAX_ENERGY - 1, updatedAt: AT_19H.toISOString() } };
    const r = applyBuyRefill(p, AT_19H);
    expect(r?.gems).toBe(150 - SHOP.refill.cost);
    expect(r?.energy.value).toBe(MAX_ENERGY);
  });
});

describe('Blitz', () => {
  it('une erreur en chrono ne coûte pas d’énergie', () => {
    const q = makeUnit('seo-1', 1)[0];
    const r = applyAnswerAction(progressWith(), { question: q, correct: false, mode: 'free', chrono: true, now: AT_19H, creditedThisSession: false });
    expect(r.energySpent).toBe(0);
    expect(r.progress.energy.value).toBe(MAX_ENERGY);
    const lesson = applyAnswerAction(progressWith(), { question: q, correct: false, mode: 'free', chrono: false, now: AT_19H, creditedThisSession: false });
    expect(lesson.energySpent).toBe(1);
  });
});

describe('test de sortie', () => {
  const seo2 = bank.filter((q) => q.unitId === 'seo-2');

  function skipTest(correctPerQuestion: boolean[]) {
    const start = progressWith();
    let p = start;
    let correctCount = 0;
    correctPerQuestion.forEach((correct, i) => {
      const r = applyAnswerAction(p, {
        question: seo2[i % seo2.length], correct, mode: 'unit', chrono: false, now: AT_19H,
        creditedThisSession: false, skipTest: true,
      });
      p = r.progress;
      if (correct) correctCount += 1;
    });
    return { p, correctCount, start };
  }

  it('les réponses rapportent des XP mais ne touchent pas les exercices de l’unité visée', () => {
    const { p } = skipTest([true, true, true, true]);
    expect(p.xp).toBe(40);
    expect(p.questions).toEqual({});
    // Test abandonné après 4 bonnes réponses : l'unité suivante reste fermée.
    const traits = allUnitTraits(p, bank, CATALOG, TODAY);
    expect(isUnitUnlocked('seo-3', traits, CATALOG)).toBe(false);
  });

  it('une erreur de test ne remplit pas la file « à revoir »', () => {
    const { p } = skipTest([false]);
    expect(p.questions).toEqual({});
  });

  it('un test raté (6/10) ne couronne pas l’unité visée et n’ouvre pas la suivante', () => {
    const { p, correctCount, start } = skipTest([false, false, false, false, true, true, true, true, true, true]);
    const end = applySessionEnd(p, {
      mode: 'unit', unitId: 'seo-2', questionCount: 10, correctCount, chrono: false, now: AT_19H,
      questions: bank, catalog: CATALOG, progressAtSessionStart: start, skipTest: true,
    });
    expect(end.newlyUnlockedUnits).toEqual([]);
    expect(end.progress.units['seo-2']).toBeUndefined();
    expect(unitTraits(end.progress, 'seo-2', bank)).toBe(0);
    const traits = allUnitTraits(end.progress, bank, CATALOG, TODAY);
    expect(isUnitUnlocked('seo-2', traits, CATALOG)).toBe(false);
    expect(isUnitUnlocked('seo-3', traits, CATALOG)).toBe(false);
  });
});

describe('leçon à cheval sur minuit', () => {
  const lesson = (startedAt: Date | undefined, now: Date, lastActiveDay: string): Partial<SessionEndAction> & { p: Progress } => {
    const p = progressWith();
    p.streak = { current: 30, best: 30, lastActiveDay, freezes: 0, freezeUsedOn: [] };
    return { p, startedAt, now };
  };
  const run = ({ p, startedAt, now }: Partial<SessionEndAction> & { p: Progress }) =>
    applySessionEnd(p, {
      mode: 'unit', unitId: 'seo-1', questionCount: 10, correctCount: 8, chrono: false, now: now as Date,
      questions: bank, catalog: CATALOG, progressAtSessionStart: p, startedAt,
    });

  it('compte pour le jour où elle a commencé', () => {
    const r = run(lesson(new Date(2026, 8, 10, 23, 57), new Date(2026, 8, 11, 0, 3), '2026-09-09'));
    expect(r.progress.streak.current).toBe(31);
    expect(r.progress.streak.lastActiveDay).toBe('2026-09-10');
    expect(r.freezeConsumedFor).toBeNull();
  });

  it('sans startedAt, ou commencée le jour même, compte pour aujourd’hui', () => {
    expect(run(lesson(undefined, new Date(2026, 8, 10, 12, 0), '2026-09-09')).progress.streak.lastActiveDay).toBe('2026-09-10');
    expect(run(lesson(new Date(2026, 8, 10, 11, 50), new Date(2026, 8, 10, 12, 0), '2026-09-09')).progress.streak.current).toBe(31);
  });

  it('ignore un lancement vieux de plusieurs jours (session laissée ouverte)', () => {
    const r = run(lesson(new Date(2026, 8, 5, 12, 0), new Date(2026, 8, 10, 12, 0), '2026-09-09'));
    expect(r.progress.streak.lastActiveDay).toBe('2026-09-10');
    expect(r.progress.streak.current).toBe(31);
  });
});

describe('session vide', () => {
  it('ne compte ni comme session terminée ni pour les publicités', () => {
    const p = progressWith();
    const r = applySessionEnd(p, {
      mode: 'review', unitId: null, questionCount: 0, correctCount: 0, chrono: false, now: AT_19H,
      questions: bank, catalog: CATALOG, progressAtSessionStart: p,
    });
    expect(r.progress.counters.sessionsCompleted).toBe(0);
    expect(r.progress.ads).toEqual(p.ads);
    expect(r.xpGained).toBe(0);
    expect(r.gemsGained).toBe(0);
  });
});
