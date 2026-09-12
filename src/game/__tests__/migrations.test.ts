import { migrateProgress } from '../migrations';
import { emptyProgress } from '../types';

describe('migrateProgress', () => {
  it('rend un état vide pour n’importe quoi d’autre qu’un objet', () => {
    expect(migrateProgress(null)).toEqual(emptyProgress());
    expect(migrateProgress('x')).toEqual(emptyProgress());
    expect(migrateProgress([1])).toEqual(emptyProgress());
  });

  it('complète une progression v0.1 sans énergie, gemmes, quêtes ni ligue', () => {
    const old = {
      schemaVersion: 1,
      xp: 340,
      questions: { k: { key: 'k', seen: 2, correct: 2, streak: 2, lastAnswerCorrect: true, lastSeenAt: null, inReview: false } },
      units: {},
      cards: {},
      streak: { current: 3, best: 5, lastActiveDay: '2026-09-09', freezes: 1, freezeUsedOn: [] },
      badges: { first_session: '2026-09-01T00:00:00.000Z' },
      counters: { sessionsCompleted: 4, reviewRecovered: 0, sourcesOpened: 0, chronoPerfects: 0, perfectSessions: 1, earlySessions: 0, nightSessions: 0, cardsReviewed: 3 },
      ads: { sessionsSinceLastAd: 4, lastAdAt: null, adsShown: 0 },
    };
    const p = migrateProgress(old);
    expect(p.xp).toBe(340);
    expect(p.streak.current).toBe(3);
    expect(p.counters.sessionsCompleted).toBe(4);
    expect(p.counters.questsCompleted).toBe(0);
    expect(p.questions.k.streak).toBe(2);
    expect(p.gems).toBe(0);
    expect(p.energy).toEqual(emptyProgress().energy);
    expect(p.quests).toEqual(emptyProgress().quests);
    expect(p.league).toEqual(emptyProgress().league);
    expect(p.boost).toEqual(emptyProgress().boost);
  });

  it('ignore une valeur d’un mauvais type et les clés inconnues', () => {
    const p = migrateProgress({ xp: 'beaucoup', gems: 12, foo: 1, streak: 'nope' });
    expect(p.xp).toBe(0);
    expect(p.gems).toBe(12);
    expect(p.streak).toEqual(emptyProgress().streak);
    expect('foo' in p).toBe(false);
  });

  it('est idempotente sur un état déjà à jour', () => {
    const current = emptyProgress();
    current.gems = 50;
    expect(migrateProgress(current)).toEqual(current);
  });
});
