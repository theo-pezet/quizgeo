import { applyAnswerAction } from '../apply';
import { PRETEST_SIZE, RELEARN_MAX, interleaveBy, pickPretest, shouldRelearn, sureAllowed, unitStarted } from '../learning';
import { CONFIDENT_STEP, applyAnswer, compareReview, reviewQueue } from '../review';
import { composeReviewSession } from '../session';
import { emptyProgress, emptyQuestionProgress, type Exercise, type QuestionProgress } from '../types';

const qcm = (key: string, n = 4): Exercise => ({ kind: 'qcm', key, unitId: key.split(':')[0], prompt: key, choices: Array.from({ length: n }, (_, i) => `${key}-${i}`), answer: 0 });
const order = (key: string): Exercise => ({ kind: 'order', key, unitId: 'u', prompt: key, steps: ['a', 'b', 'c'] });
const NOW = '2026-11-14T10:00:00.000Z';

describe('prétest', () => {
  it('prend les derniers QCM d’au moins trois choix, sans doublon, dans l’ordre de la leçon', () => {
    const session = [order('u:o'), qcm('u:a', 2), qcm('u:b'), qcm('u:b'), qcm('u:c'), qcm('u:d')];
    expect(pickPretest(session, false).map((e) => e.key)).toEqual(['u:c', 'u:d']);
    // Jamais la toute première question : elle reviendrait aussitôt.
    expect(pickPretest([qcm('u:a'), qcm('u:b'), qcm('u:c'), qcm('u:a')], false).map((e) => e.key)).toEqual(['u:c', 'u:a']);
    expect(PRETEST_SIZE).toBe(2);
    expect(pickPretest(session, false, 3).map((e) => e.key)).toEqual(['u:b', 'u:c', 'u:d']);
  });

  it('ne concerne que les unités jamais commencées', () => {
    expect(pickPretest([qcm('u:a')], true)).toEqual([]);
    const p = emptyProgress();
    expect(unitStarted(p, 'u')).toBe(false);
    p.questions['uu:x'] = { ...emptyQuestionProgress('uu:x'), seen: 3 };
    p.questions['u:a'] = emptyQuestionProgress('u:a');
    expect(unitStarted(p, 'u')).toBe(false);
    p.questions['u:a'] = { ...emptyQuestionProgress('u:a'), seen: 1 };
    expect(unitStarted(p, 'u')).toBe(true);
  });
});

describe('entrelacement', () => {
  it('alterne les groupes et garde l’ordre dans chaque groupe', () => {
    const items = ['m1', 'm2', 'm3', 'a1', 'p1', 'a2'];
    expect(interleaveBy(items, (s) => s[0])).toEqual(['m1', 'a1', 'p1', 'm2', 'a2', 'm3']);
    expect(interleaveBy([], (s: string) => s)).toEqual([]);
  });

  it('s’applique aux révisions quand on donne la matière', () => {
    const byKey = new Map(['m:1', 'm:2', 'a:1'].map((k) => [k, qcm(k)]));
    const queue = ['m:1', 'm:2', 'a:1'].map((k, i) => ({ ...emptyQuestionProgress(k), inReview: true, lastSeenAt: `2026-11-0${i + 1}T00:00:00.000Z` }));
    expect(composeReviewSession(queue, byKey).map((e) => e.key)).toEqual(['m:1', 'm:2', 'a:1']);
    expect(composeReviewSession(queue, byKey, 10, (e) => e.unitId).map((e) => e.key)).toEqual(['m:1', 'a:1', 'm:2']);
  });
});

describe('confiance et hypercorrection', () => {
  it('marque une erreur commise en étant sûr, et l’efface à la bonne réponse', () => {
    const miss = applyAnswer(undefined, 'k', false, NOW, false, true).progress;
    expect(miss.confidentMiss).toBe(true);
    expect(applyAnswer(undefined, 'k', false, NOW).progress.confidentMiss).toBeUndefined();
    expect(applyAnswer(miss, 'k', true, NOW, false, true).progress.confidentMiss).toBeUndefined();
  });

  it('met les erreurs « sûres » en tête de la file', () => {
    const a: QuestionProgress = { ...emptyQuestionProgress('a'), inReview: true, lastSeenAt: '2026-11-01T00:00:00.000Z' };
    const b: QuestionProgress = { ...emptyQuestionProgress('b'), inReview: true, lastSeenAt: '2026-11-05T00:00:00.000Z', confidentMiss: true };
    expect(compareReview(a, b)).toBe(1);
    expect(compareReview(b, a)).toBe(-1);
    expect(compareReview(a, { ...a, key: 'z' })).toBe(-1);
    const p = emptyProgress();
    p.questions = { a, b };
    expect(reviewQueue(p).map((q) => q.key)).toEqual(['b', 'a']);
  });

  it('passe par applyAnswerAction', () => {
    const r = applyAnswerAction(emptyProgress(), { question: qcm('u:a'), correct: false, mode: 'review', chrono: false, now: new Date(NOW), creditedThisSession: false, confident: true });
    expect(r.progress.questions['u:a'].confidentMiss).toBe(true);
  });
});

describe('réapprentissage jusqu’au critère', () => {
  it('fait revenir une erreur au plus RELEARN_MAX fois dans la séance', () => {
    expect(shouldRelearn(0)).toBe(false);
    expect(shouldRelearn(1)).toBe(true);
    expect(shouldRelearn(RELEARN_MAX)).toBe(true);
    expect(shouldRelearn(RELEARN_MAX + 1)).toBe(false);
  });
});

describe('« I’m sure »', () => {
  const TODAY = '2026-11-14';
  const missed = applyAnswer(undefined, 'k', false, NOW).progress;

  it('date la dernière erreur, et la garde après une bonne réponse', () => {
    expect(missed.lastMissAt).toBe(NOW);
    const later = '2026-11-15T10:00:00.000Z';
    expect(applyAnswer(missed, 'k', true, later).progress.lastMissAt).toBe(NOW);
    expect(applyAnswer(undefined, 'k', true, NOW).progress.lastMissAt).toBeUndefined();
  });

  it('n’est pas proposé quand la réponse est fraîche : rattrapage, déjà dévoilée, ratée le jour même', () => {
    expect(sureAllowed({ question: undefined, revealedThisSession: false, retry: false, today: TODAY })).toBe(true);
    expect(sureAllowed({ question: undefined, revealedThisSession: false, retry: true, today: TODAY })).toBe(false);
    expect(sureAllowed({ question: undefined, revealedThisSession: true, retry: false, today: TODAY })).toBe(false);
    const missedToday = { ...missed, lastMissAt: new Date(2026, 10, 14, 9).toISOString() };
    expect(sureAllowed({ question: missedToday, revealedThisSession: false, retry: false, today: TODAY })).toBe(false);
    // Le lendemain, le bouton revient.
    expect(sureAllowed({ question: missedToday, revealedThisSession: false, retry: false, today: '2026-11-15' })).toBe(true);
  });

  it('une bonne réponse sûre vaut deux : la question sort aussitôt de la file', () => {
    expect(CONFIDENT_STEP).toBe(2);
    const sure = applyAnswer(missed, 'k', true, NOW, false, true);
    expect(sure.progress.streak).toBe(2);
    expect(sure.leftQueue).toBe(true);
    const plain = applyAnswer(missed, 'k', true, NOW, false, false);
    expect(plain.progress.streak).toBe(1);
    expect(plain.progress.inReview).toBe(true);
    // Déjà créditée dans la séance : rien de plus, sûr ou pas.
    expect(applyAnswer({ ...missed, streak: 1 }, 'k', true, NOW, true, true).progress.streak).toBe(1);
    // Plafond respecté.
    expect(applyAnswer({ ...missed, streak: 4 }, 'k', true, NOW, false, true).progress.streak).toBe(5);
  });
});
