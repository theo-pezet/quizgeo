import { applyAnswerAction, applyCardReview, applySessionEnd } from '../apply';
import {
  DAILY_DECK_CAP,
  DAILY_DUEL_CAP,
  DAILY_REVIEW_CAP,
  countGuided,
  countLesson,
  guidedLeft,
  guidedToday,
  guidedUnit,
  nextGuidedBlock,
  pickLessonSubject,
  type GuidedInput,
} from '../guided';
import { STUDY_PLAN_WEIGHTS } from '../study';
import { catalogFrom, emptyGuided, emptyProgress, type Exercise } from '../types';

const D1 = '2026-11-27';
const D2 = '2026-11-28';

const q: Exercise = { kind: 'qcm', key: 'u1:x:1', unitId: 'u1', prompt: 'p', choices: ['a', 'b'], answer: 0 };

describe('compteurs du jour', () => {
  it('repart à zéro un nouveau jour mais garde la rotation', () => {
    let p = countGuided(emptyProgress(), 'deck', 3, D1);
    p = countLesson(p, 'marketing', 'm1', D1);
    p = countLesson(p, 'marketing', 'm1', D1);
    expect(p.guided).toEqual({ day: D1, deck: 3, review: 0, duels: 0, lessons: 2, units: ['m1'], lessonCounts: { marketing: 2 } });
    // État d'avant la 1.7.1, sans la liste des unités du jour.
    const old = { ...p, guided: { ...p.guided, units: undefined as unknown as string[] } };
    expect(countLesson(old, 'ia', 'i1', D1).guided.units).toEqual(['i1']);
    const next = guidedToday(p.guided, D2);
    expect(next).toEqual({ ...emptyGuided(), day: D2, lessonCounts: { marketing: 2 } });
    expect(guidedToday(p.guided, D1)).toBe(p.guided);
    expect(guidedToday(undefined, D1).day).toBe(D1);
  });

  it('ne compte jamais en négatif', () => {
    expect(countGuided(emptyProgress(), 'duels', -2, D1).guided.duels).toBe(0);
  });

  it('calcule ce qui reste sous chaque plafond', () => {
    let p = countGuided(emptyProgress(), 'deck', 12, D1);
    p = countGuided(p, 'review', 4, D1);
    p = countGuided(p, 'duels', 1, D1);
    expect(guidedLeft(p, D1)).toEqual({ deck: 0, review: DAILY_REVIEW_CAP - 4, duels: DAILY_DUEL_CAP - 1 });
    expect(guidedLeft(p, D2)).toEqual({ deck: DAILY_DECK_CAP, review: DAILY_REVIEW_CAP, duels: DAILY_DUEL_CAP });
  });
});

describe('rotation des thèmes', () => {
  const all = ['marketing', 'ia', 'python', 'js', 'html', 'css', 'secu'];

  it('suit les poids sur la durée', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 100; i += 1) {
      const id = pickLessonSubject(counts, all, STUDY_PLAN_WEIGHTS) as string;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts).toEqual({ marketing: 30, ia: 25, python: 25, js: 8, html: 4, css: 4, secu: 4 });
  });

  it('commence par le plus gros poids et alterne les grands thèmes', () => {
    const counts: Record<string, number> = {};
    const order: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const id = pickLessonSubject(counts, all, STUDY_PLAN_WEIGHTS) as string;
      order.push(id);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(order).toEqual(['marketing', 'ia', 'python']);
  });

  it('rattrape un thème en retard', () => {
    expect(pickLessonSubject({ marketing: 10, ia: 10, python: 0 }, ['marketing', 'ia', 'python'], STUDY_PLAN_WEIGHTS)).toBe('python');
  });

  it('ignore les matières sans leçon et accepte une matière inconnue', () => {
    expect(pickLessonSubject({}, [], STUDY_PLAN_WEIGHTS)).toBeNull();
    expect(pickLessonSubject({}, ['zzz', 'yyy'], {})).toBe('zzz');
    // À égalité de retard, le plus gros poids passe devant, quel que soit l'ordre donné.
    expect(pickLessonSubject({}, ['a', 'b'], { a: 1, b: 1 })).toBe('a');
    expect(pickLessonSubject({ a: 1, b: 1 }, ['a', 'b'], { a: 1, b: 1 })).toBe('a');
    // Retards égaux (0,5 chacun) : le poids 3 l'emporte sur le poids 1.
    expect(pickLessonSubject({ b: 1 }, ['a', 'b'], { a: 1, b: 3 })).toBe('b');
  });
});

describe('unité proposée', () => {
  const catalog = catalogFrom([
    { id: 'p1', subjectId: 'python' },
    { id: 'p2', subjectId: 'python' },
    { id: 'p3', subjectId: 'python' },
  ]);

  it('prend l’unité du chemin si elle n’a pas été faite aujourd’hui', () => {
    expect(guidedUnit('python', {}, catalog, [])).toBe('p1');
  });

  it('passe à l’unité ouverte suivante quand celle du chemin a été faite aujourd’hui', () => {
    expect(guidedUnit('python', { p1: 1 }, catalog, ['p1'])).toBe('p2');
  });

  it('attend demain quand la suivante est fermée ou que tout est fait', () => {
    expect(guidedUnit('python', {}, catalog, ['p1'])).toBeNull();
    expect(guidedUnit('python', { p1: 3, p2: 1 }, catalog, ['p2'])).toBe('p3');
    expect(guidedUnit('python', { p1: 3, p2: 3, p3: 3 }, catalog, ['p3'])).toBeNull();
    expect(guidedUnit('vide', {}, catalog, [])).toBeNull();
  });
});

describe('prochain bloc', () => {
  const base: GuidedInput = {
    left: { deck: 10, review: 10, duels: 5 },
    deckAvailable: 30,
    reviewAvailable: 25,
    duelsAvailable: 8,
    lessonSubject: 'marketing',
    goalMet: false,
  };

  it('deck, puis erreurs, puis duels, puis leçons', () => {
    expect(nextGuidedBlock(base)).toEqual({ kind: 'deck', size: 10 });
    expect(nextGuidedBlock({ ...base, left: { ...base.left, deck: 0 } })).toEqual({ kind: 'review', size: 10 });
    expect(nextGuidedBlock({ ...base, deckAvailable: 0, reviewAvailable: 3 })).toEqual({ kind: 'review', size: 3 });
    expect(nextGuidedBlock({ ...base, deckAvailable: 0, reviewAvailable: 0 })).toEqual({ kind: 'duels', size: 5 });
    expect(nextGuidedBlock({ ...base, deckAvailable: 0, reviewAvailable: 0, duelsAvailable: 0 })).toEqual({ kind: 'lesson', subjectId: 'marketing', extra: false });
  });

  it('propose une leçon en plus après l\'objectif, et rien quand tout est fini', () => {
    const empty = { ...base, deckAvailable: 0, reviewAvailable: 0, duelsAvailable: 0 };
    expect(nextGuidedBlock({ ...empty, goalMet: true })).toEqual({ kind: 'lesson', subjectId: 'marketing', extra: true });
    expect(nextGuidedBlock({ ...empty, lessonSubject: null })).toEqual({ kind: 'done' });
  });
});

describe('branchements dans apply', () => {
  const now = new Date(`${D1}T10:00:00`);

  it('une erreur revue compte une fois, pas son rattrapage', () => {
    let p = applyAnswerAction(emptyProgress(), { question: q, correct: false, mode: 'review', chrono: false, now, creditedThisSession: false }).progress;
    p = applyAnswerAction(p, { question: q, correct: true, mode: 'review', chrono: false, now, creditedThisSession: false, retry: true }).progress;
    p = applyAnswerAction(p, { question: q, correct: true, mode: 'unit', chrono: false, now, creditedThisSession: false }).progress;
    expect(p.guided.review).toBe(1);
  });

  it('une carte du deck compte une fois par jour', () => {
    let p = applyCardReview(emptyProgress(), { cardId: 'c1', grade: 'again', now }).progress;
    p = applyCardReview(p, { cardId: 'c1', grade: 'good', now }).progress;
    expect(p.guided.deck).toBe(1);
  });

  it('une leçon d\'unité finie nourrit la rotation de sa matière', () => {
    const catalog = catalogFrom([{ id: 'u1', subjectId: 'python' }]);
    const end = (skipTest: boolean, unitId: string | null, questionCount = 10) =>
      applySessionEnd(emptyProgress(), { mode: 'unit', unitId, questionCount, correctCount: 8, chrono: false, now, questions: [q], catalog, skipTest, progressAtSessionStart: emptyProgress() }).progress.guided;
    expect(end(false, 'u1').lessonCounts).toEqual({ python: 1 });
    expect(end(false, 'u1').units).toEqual(['u1']);
    expect(end(true, 'u1').lessonCounts).toEqual({});
    expect(end(false, null).lessonCounts).toEqual({});
    expect(end(false, 'inconnue').lessonCounts).toEqual({});
    expect(end(false, 'u1', 1).lessonCounts).toEqual({});
  });
});
