/**
 * Un test par badge, en deux temps : l'état minimal qui le déclenche, et
 * l'état juste en dessous qui ne le déclenche pas .
 */

import {
  BADGES,
  BADGE_IDS,
  awardBadges,
  evaluateBadges,
  isEarlyHour,
  isNightHour,
  type BadgeContext,
  type BadgeId,
} from '../badges';
import type { Progress, Traits, UnitId } from '../types';
import { CATALOG, progressWith } from './fixtures';

const NOW = '2026-09-09T19:30:00.000Z';

function traitsMap(value: Traits): Record<string, Traits> {
  const out: Record<string, Traits> = {};
  for (const unit of CATALOG.units) out[unit.id] = value;
  return out;
}

function withTraits(overrides: Record<string, Traits>): Record<string, Traits> {
  return { ...traitsMap(0), ...overrides };
}

function subjectAt5(subject: string): Record<string, Traits> {
  return { [`${subject}-1`]: 5, [`${subject}-2`]: 5, [`${subject}-3`]: 5 };
}

function ctx(
  progress: Partial<Progress> = {},
  traitsByUnit: Record<string, Traits> = traitsMap(0),
): BadgeContext {
  const base = progressWith();
  return {
    progress: {
      ...base,
      ...progress,
      counters: { ...base.counters, ...(progress.counters ?? {}) },
      streak: { ...base.streak, ...(progress.streak ?? {}) },
    },
    traitsByUnit,
    catalog: CATALOG,
  };
}

function earns(id: BadgeId, context: BadgeContext): boolean {
  return evaluateBadges(context).includes(id);
}

describe('les 18 badges sont tous définis, une fois chacun', () => {
  it('a 18 identifiants uniques', () => {
    expect(BADGES).toHaveLength(18);
    expect(new Set(BADGE_IDS).size).toBe(18);
  });
});

describe('first_session — Premier pas', () => {
  it('tombe à la première session terminée', () => {
    expect(earns('first_session', ctx({ counters: { sessionsCompleted: 1 } as never }))).toBe(true);
  });
  it('ne tombe pas à zéro session', () => {
    expect(earns('first_session', ctx())).toBe(false);
  });
});

describe('perfect — Sans faute', () => {
  it('tombe après une session à 10/10', () => {
    expect(earns('perfect', ctx({ counters: { perfectSessions: 1 } as never }))).toBe(true);
  });
  it('ne tombe pas sans session parfaite', () => {
    expect(earns('perfect', ctx({ counters: { sessionsCompleted: 40 } as never }))).toBe(false);
  });
});

describe('highlighter — Trois couronnes', () => {
  it('tombe dès qu’une unité atteint 3 couronnes, ou plus', () => {
    expect(earns('highlighter', ctx({}, withTraits({ 'seo-1': 3 })))).toBe(true);
    expect(earns('highlighter', ctx({}, withTraits({ 'seo-1': 5 })))).toBe(true);
  });
  it('ne tombe pas à 2 couronnes', () => {
    expect(earns('highlighter', ctx({}, withTraits({ 'seo-1': 2 })))).toBe(false);
  });
});

describe('chapter — Chapitre clos', () => {
  it('tombe quand toutes les unités d’une matière sont à 5 couronnes', () => {
    expect(earns('chapter', ctx({}, withTraits(subjectAt5('web'))))).toBe(true);
  });
  it('ne tombe pas s’il manque une unité de la matière', () => {
    const t = withTraits({ ...subjectAt5('web'), 'web-3': 4 });
    expect(earns('chapter', ctx({}, t))).toBe(false);
  });
});

describe('encyclopedia — Encyclopédie', () => {
  it('tombe quand les 15 unités sont à 5 couronnes', () => {
    expect(earns('encyclopedia', ctx({}, traitsMap(5)))).toBe(true);
  });
  it('ne tombe pas s’il reste une seule unité en dessous', () => {
    const t = { ...traitsMap(5), 'gr-3': 4 as Traits };
    expect(earns('encyclopedia', ctx({}, t))).toBe(false);
  });
});

describe('les badges de série', () => {
  const at = (best: number) => ctx({ streak: { best } as never });

  it('streak_3 tombe à 3 et pas à 2', () => {
    expect(earns('streak_3', at(3))).toBe(true);
    expect(earns('streak_3', at(2))).toBe(false);
  });
  it('streak_7 tombe à 7 et pas à 6', () => {
    expect(earns('streak_7', at(7))).toBe(true);
    expect(earns('streak_7', at(6))).toBe(false);
  });
  it('streak_30 tombe à 30 et pas à 29', () => {
    expect(earns('streak_30', at(30))).toBe(true);
    expect(earns('streak_30', at(29))).toBe(false);
  });

  it('reste acquis même si la série retombe : il se juge sur le meilleur', () => {
    expect(earns('streak_7', ctx({ streak: { current: 1, best: 12 } as never }))).toBe(true);
  });
});

describe('early — Lève-tôt', () => {
  it('tombe après une session terminée entre 5 h et 8 h', () => {
    expect(earns('early', ctx({ counters: { earlySessions: 1 } as never }))).toBe(true);
  });
  it('ne tombe pas sinon', () => {
    expect(earns('early', ctx())).toBe(false);
  });

  it('borne la fenêtre à [5 h, 8 h[', () => {
    expect(isEarlyHour(4)).toBe(false);
    expect(isEarlyHour(5)).toBe(true);
    expect(isEarlyHour(7)).toBe(true);
    expect(isEarlyHour(8)).toBe(false);
  });
});

describe('night — Noctambule', () => {
  it('tombe après une session terminée entre 23 h et 2 h', () => {
    expect(earns('night', ctx({ counters: { nightSessions: 1 } as never }))).toBe(true);
  });
  it('ne tombe pas sinon', () => {
    expect(earns('night', ctx())).toBe(false);
  });

  it('enjambe minuit', () => {
    expect(isNightHour(22)).toBe(false);
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(1)).toBe(true);
    expect(isNightHour(2)).toBe(false);
  });
});

describe('corrector — Correcteur', () => {
  it('tombe à 20 questions récupérées', () => {
    expect(earns('corrector', ctx({ counters: { reviewRecovered: 20 } as never }))).toBe(true);
  });
  it('ne tombe pas à 19', () => {
    expect(earns('corrector', ctx({ counters: { reviewRecovered: 19 } as never }))).toBe(false);
  });
});

describe('chrono — Chronomètre', () => {
  it('tombe après un 10/10 en mode chrono', () => {
    expect(earns('chrono', ctx({ counters: { chronoPerfects: 1 } as never }))).toBe(true);
  });
  it('ne tombe pas pour un 10/10 hors chrono', () => {
    expect(
      earns('chrono', ctx({ counters: { perfectSessions: 3, chronoPerfects: 0 } as never })),
    ).toBe(false);
  });
});

describe('reader — Lecteur', () => {
  it('tombe à 10 liens source ouverts', () => {
    expect(earns('reader', ctx({ counters: { sourcesOpened: 10 } as never }))).toBe(true);
  });
  it('ne tombe pas à 9', () => {
    expect(earns('reader', ctx({ counters: { sourcesOpened: 9 } as never }))).toBe(false);
  });
});

describe('regular — Fidèle', () => {
  it('tombe à 100 sessions', () => {
    expect(earns('regular', ctx({ counters: { sessionsCompleted: 100 } as never }))).toBe(true);
  });
  it('ne tombe pas à 99', () => {
    expect(earns('regular', ctx({ counters: { sessionsCompleted: 99 } as never }))).toBe(false);
  });
});

describe('legendary — Légendaire', () => {
  it('tombe à 5 couronnes, pas à 4', () => {
    expect(earns('legendary', ctx({}, withTraits({ 'seo-1': 5 })))).toBe(true);
    expect(earns('legendary', ctx({}, withTraits({ 'seo-1': 4 })))).toBe(false);
  });
});

describe('quests_10 — Chasseur de quêtes', () => {
  it('tombe à 10 quêtes accomplies, pas à 9', () => {
    expect(earns('quests_10', ctx({ counters: { questsCompleted: 10 } as never }))).toBe(true);
    expect(earns('quests_10', ctx({ counters: { questsCompleted: 9 } as never }))).toBe(false);
  });
});

describe('league_gold — Ligue Or', () => {
  it('tombe en division Or (2) ou plus, pas en Argent', () => {
    const base = progressWith();
    expect(earns('league_gold', ctx({ league: { ...base.league, tier: 2 } }))).toBe(true);
    expect(earns('league_gold', ctx({ league: { ...base.league, tier: 1 } }))).toBe(false);
  });
});

describe('goal_7 — Objectif ×7', () => {
  it('tombe à 7 jours d’objectif atteint, pas à 6', () => {
    expect(earns('goal_7', ctx({ counters: { goalDays: 7 } as never }))).toBe(true);
    expect(earns('goal_7', ctx({ counters: { goalDays: 6 } as never }))).toBe(false);
  });
});

describe('evaluateBadges', () => {
  it('ne re-décerne jamais un badge déjà obtenu', () => {
    const context = ctx({
      counters: { sessionsCompleted: 1 } as never,
      badges: { first_session: NOW },
    });
    expect(evaluateBadges(context)).toEqual([]);
  });

  it('rend plusieurs badges d’un coup, dans l’ordre de définition', () => {
    const context = ctx(
      {
        counters: { sessionsCompleted: 100, perfectSessions: 1 } as never,
        streak: { best: 30 } as never,
      },
      traitsMap(5),
    );
    expect(evaluateBadges(context)).toEqual([
      'first_session',
      'perfect',
      'highlighter',
      'chapter',
      'encyclopedia',
      'streak_3',
      'streak_7',
      'streak_30',
      'regular',
      'legendary',
    ]);
  });
});

describe('awardBadges', () => {
  it('inscrit la date d’obtention', () => {
    expect(awardBadges({}, ['perfect'], NOW)).toEqual({ perfect: NOW });
  });

  it('ne réécrit pas une date déjà posée', () => {
    const before = { perfect: '2026-01-01T00:00:00.000Z' };
    expect(awardBadges(before, ['perfect'], NOW)).toEqual(before);
  });

  it('ne mute pas l’entrée', () => {
    const before: Record<string, string> = {};
    awardBadges(before, ['reader'], NOW);
    expect(before).toEqual({});
  });
});
