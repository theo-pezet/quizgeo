import {
  MAX_FREEZES,
  isActiveToday,
  recordActiveDay,
  sessionCountsForStreak,
  streakIsAtRisk,
} from '../streak';
import type { StreakState } from '../types';

function streak(overrides: Partial<StreakState> = {}): StreakState {
  return {
    current: 0,
    best: 0,
    lastActiveDay: null,
    freezes: 0,
    freezeUsedOn: [],
    ...overrides,
  };
}

describe('sessionCountsForStreak', () => {
  it('exige au moins 5 questions', () => {
    expect(sessionCountsForStreak(5)).toBe(true);
    expect(sessionCountsForStreak(4)).toBe(false);
  });
});

describe('recordActiveDay', () => {
  it('démarre la série à 1 au tout premier jour', () => {
    const r = recordActiveDay(streak(), '2026-09-09');
    expect(r.streak.current).toBe(1);
    expect(r.streak.best).toBe(1);
    expect(r.streak.lastActiveDay).toBe('2026-09-09');
    expect(r.reset).toBe(false);
  });

  it('ne fait rien si le jour est déjà actif', () => {
    const before = streak({ current: 4, best: 9, lastActiveDay: '2026-09-09' });
    const r = recordActiveDay(before, '2026-09-09');
    expect(r.streak.current).toBe(4);
    expect(r.incremented).toBe(false);
  });

  it('incrémente le lendemain', () => {
    const r = recordActiveDay(
      streak({ current: 4, best: 4, lastActiveDay: '2026-09-08' }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(5);
    expect(r.streak.best).toBe(5);
    expect(r.incremented).toBe(true);
  });

  it('garde le meilleur score quand la série courante est plus basse', () => {
    const r = recordActiveDay(
      streak({ current: 2, best: 30, lastActiveDay: '2026-09-08' }),
      '2026-09-09',
    );
    expect(r.streak.best).toBe(30);
  });

  it('consomme un gel après une seule journée manquée', () => {
    const r = recordActiveDay(
      streak({ current: 9, best: 9, lastActiveDay: '2026-09-07', freezes: 1 }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(10);
    expect(r.streak.freezes).toBe(0);
    expect(r.freezeConsumedFor).toBe('2026-09-08');
    expect(r.streak.freezeUsedOn).toEqual(['2026-09-08']);
  });

  it('casse la série après une journée manquée sans gel', () => {
    const r = recordActiveDay(
      streak({ current: 9, best: 9, lastActiveDay: '2026-09-07', freezes: 0 }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(1);
    expect(r.streak.best).toBe(9);
    expect(r.reset).toBe(true);
  });

  it('casse la série après DEUX journées manquées, même avec deux gels', () => {
    const r = recordActiveDay(
      streak({ current: 20, best: 20, lastActiveDay: '2026-09-06', freezes: 2 }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(1);
    expect(r.streak.freezes).toBe(2);
    expect(r.freezeConsumedFor).toBeNull();
  });

  it('gagne un gel au 7e jour puis au 14e', () => {
    const at7 = recordActiveDay(
      streak({ current: 6, best: 6, lastActiveDay: '2026-09-08' }),
      '2026-09-09',
    );
    expect(at7.streak.current).toBe(7);
    expect(at7.streak.freezes).toBe(1);
    expect(at7.freezeGained).toBe(true);

    const at14 = recordActiveDay(
      streak({ current: 13, best: 13, lastActiveDay: '2026-09-08', freezes: 1 }),
      '2026-09-09',
    );
    expect(at14.streak.freezes).toBe(2);
  });

  it('plafonne la réserve à deux gels', () => {
    const r = recordActiveDay(
      streak({ current: 20, best: 20, lastActiveDay: '2026-09-08', freezes: MAX_FREEZES }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(21);
    expect(r.streak.freezes).toBe(MAX_FREEZES);
    expect(r.freezeGained).toBe(false);
  });

  it('n’attribue pas de gel sur un jour non multiple de 7', () => {
    const r = recordActiveDay(
      streak({ current: 7, best: 7, lastActiveDay: '2026-09-08' }),
      '2026-09-09',
    );
    expect(r.streak.current).toBe(8);
    expect(r.freezeGained).toBe(false);
  });

  it('ne casse pas la série quand l’horloge est dans le futur', () => {
    const before = streak({ current: 12, best: 12, lastActiveDay: '2026-12-31' });
    const r = recordActiveDay(before, '2026-09-09');
    expect(r.streak.current).toBe(12);
    expect(r.streak.lastActiveDay).toBe('2026-09-09');
    expect(r.reset).toBe(false);
  });

  it('survit à un changement de fuseau qui rejoue le même jour', () => {
    // Paris → Los Angeles : la session de 8 h du matin est rejouée en soirée
    // la veille en heure locale de destination.
    const paris = recordActiveDay(
      streak({ current: 5, best: 5, lastActiveDay: '2026-09-08' }),
      '2026-09-09',
    );
    const la = recordActiveDay(paris.streak, '2026-09-09');
    expect(la.streak.current).toBe(6);
  });

  it('survit au passage à l’heure d’hiver (nuit de 25 h)', () => {
    // 25 octobre 2026 → 26 octobre : un jour calendaire, quelle que soit la nuit.
    const r = recordActiveDay(
      streak({ current: 3, best: 3, lastActiveDay: '2026-10-25' }),
      '2026-10-26',
    );
    expect(r.streak.current).toBe(4);
  });

  it('traverse un changement de mois et d’année', () => {
    expect(
      recordActiveDay(streak({ current: 1, lastActiveDay: '2026-12-31' }), '2027-01-01').streak
        .current,
    ).toBe(2);
    expect(
      recordActiveDay(streak({ current: 1, lastActiveDay: '2028-02-28', freezes: 1 }), '2028-03-01')
        .freezeConsumedFor,
    ).toBe('2028-02-29'); // 2028 est bissextile
  });
});

describe('affichage', () => {
  it('allume la flamme le jour actif seulement', () => {
    expect(isActiveToday(streak({ lastActiveDay: '2026-09-09' }), '2026-09-09')).toBe(true);
    expect(isActiveToday(streak({ lastActiveDay: '2026-09-08' }), '2026-09-09')).toBe(false);
    expect(isActiveToday(streak(), '2026-09-09')).toBe(false);
  });

  it('signale une série en sursis', () => {
    expect(streakIsAtRisk(streak({ current: 5, lastActiveDay: '2026-09-08' }), '2026-09-09')).toBe(
      true,
    );
    expect(streakIsAtRisk(streak({ current: 5, lastActiveDay: '2026-09-09' }), '2026-09-09')).toBe(
      false,
    );
    expect(streakIsAtRisk(streak(), '2026-09-09')).toBe(false);
    expect(streakIsAtRisk(streak({ current: 0, lastActiveDay: '2026-09-01' }), '2026-09-09')).toBe(
      false,
    );
  });
});
