import {
  addXp,
  isPerfectSession,
  levelForXp,
  levelProgress,
  levelUp,
  xpForAnswer,
  xpForSession,
  xpThresholdForLevel,
} from '../xp';

describe('xpForAnswer — chaque ligne du tableau §4.4', () => {
  it('donne 10 XP pour une bonne réponse en session d’unité', () => {
    expect(xpForAnswer({ mode: 'unit', correct: true, chrono: false })).toBe(10);
  });

  it('donne 5 XP pour une bonne réponse en révision', () => {
    expect(xpForAnswer({ mode: 'review', correct: true, chrono: false })).toBe(5);
    expect(xpForAnswer({ mode: 'free', correct: true, chrono: false })).toBe(5);
  });

  it('double les XP de réponse en mode chrono', () => {
    expect(xpForAnswer({ mode: 'unit', correct: true, chrono: true })).toBe(20);
    expect(xpForAnswer({ mode: 'review', correct: true, chrono: true })).toBe(10);
  });

  it('donne 0 pour une mauvaise réponse, jamais du négatif', () => {
    expect(xpForAnswer({ mode: 'unit', correct: false, chrono: false })).toBe(0);
    expect(xpForAnswer({ mode: 'unit', correct: false, chrono: true })).toBe(0);
  });
});

describe('xpForSession', () => {
  it('ajoute 20 XP pour une session terminée d’au moins 5 questions', () => {
    expect(xpForSession({ mode: 'review', questionCount: 5, correctCount: 0, chrono: false }))
      .toMatchObject({ completion: 20, perfect: 0, total: 20 });
  });

  it('n’ajoute rien pour une session de moins de 5 questions', () => {
    const r = xpForSession({ mode: 'review', questionCount: 4, correctCount: 4, chrono: false });
    expect(r.completion).toBe(0);
    expect(r.total).toBe(20); // 4 × 5 XP de réponses, aucun bonus
  });

  it('ajoute 30 XP de plus pour un 10/10', () => {
    const r = xpForSession({ mode: 'unit', questionCount: 10, correctCount: 10, chrono: false });
    expect(r).toEqual({ answers: 100, completion: 20, perfect: 30, total: 150 });
  });

  it('ne double PAS les bonus de session en mode chrono', () => {
    const r = xpForSession({ mode: 'unit', questionCount: 10, correctCount: 10, chrono: true });
    expect(r).toEqual({ answers: 200, completion: 20, perfect: 30, total: 250 });
  });

  it('refuse le bonus « sans faute » à une session courte sans faute', () => {
    const r = xpForSession({ mode: 'review', questionCount: 7, correctCount: 7, chrono: false });
    expect(r.perfect).toBe(0);
  });
});

describe('isPerfectSession', () => {
  it('exige 10 questions ET 10 bonnes réponses', () => {
    expect(isPerfectSession(10, 10)).toBe(true);
    expect(isPerfectSession(10, 9)).toBe(false);
    expect(isPerfectSession(9, 9)).toBe(false);
  });
});

describe('les seuils de niveau', () => {
  it('suit 100 × n × (n − 1) / 2', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(xpThresholdForLevel)).toEqual([
      0, 100, 300, 600, 1000, 1500, 2100,
    ]);
  });

  it('traite le niveau 0 et les niveaux négatifs comme 0 XP', () => {
    expect(xpThresholdForLevel(0)).toBe(0);
    expect(xpThresholdForLevel(-3)).toBe(0);
  });

  it('rend le bon niveau de part et d’autre de chaque seuil', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(999)).toBe(4);
    expect(levelForXp(1000)).toBe(5);
    expect(levelForXp(2100)).toBe(7);
  });

  it('n’a pas de plafond', () => {
    expect(levelForXp(100000)).toBeGreaterThan(40);
  });

  it('traite un XP négatif comme le niveau 1', () => {
    expect(levelForXp(-50)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('situe le joueur dans son niveau', () => {
    expect(levelProgress(450)).toEqual({
      level: 3,
      intoLevel: 150,
      levelSpan: 300,
      ratio: 0.5,
      xpToNextLevel: 150,
    });
  });

  it('borne un XP négatif à 0', () => {
    expect(levelProgress(-10).intoLevel).toBe(0);
  });
});

describe('addXp — les XP ne baissent jamais', () => {
  it('additionne normalement', () => {
    expect(addXp(100, 30)).toBe(130);
  });

  it('ignore un delta négatif', () => {
    expect(addXp(100, -30)).toBe(100);
  });

  it('ramène un total négatif à 0 avant d’ajouter', () => {
    expect(addXp(-100, 10)).toBe(10);
  });
});

describe('levelUp', () => {
  it('détecte le franchissement', () => {
    expect(levelUp(90, 120)).toEqual({ crossed: true, from: 1, to: 2 });
  });

  it('ne signale rien à l’intérieur d’un niveau', () => {
    expect(levelUp(120, 150)).toEqual({ crossed: false, from: 2, to: 2 });
  });
});
