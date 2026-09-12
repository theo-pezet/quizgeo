import { applyAnswer, compareByLastSeen, reviewQueue, reviewQueueSize } from '../review';
import { emptyQuestionProgress, type QuestionProgress } from '../types';
import { progressWith } from './fixtures';

const T1 = '2026-09-09T09:00:00.000Z';
const T2 = '2026-09-09T10:00:00.000Z';
const T3 = '2026-09-09T11:00:00.000Z';

describe('applyAnswer', () => {
  it('crée la progression d’une question jamais vue', () => {
    const r = applyAnswer(undefined, 'Q-FOND-001', true, T1);
    expect(r.progress).toEqual({
      key: 'Q-FOND-001',
      seen: 1,
      correct: 1,
      streak: 1,
      lastAnswerCorrect: true,
      lastSeenAt: T1,
      inReview: false,
    });
  });

  it('incrémente seen et lastSeenAt dans tous les cas', () => {
    const wrong = applyAnswer(emptyQuestionProgress('K'), 'K', false, T1);
    expect(wrong.progress.seen).toBe(1);
    expect(wrong.progress.correct).toBe(0);
    expect(wrong.progress.lastSeenAt).toBe(T1);
    expect(wrong.progress.lastAnswerCorrect).toBe(false);
  });

  it('plafonne le streak à 5', () => {
    let qp = emptyQuestionProgress('K');
    for (let i = 0; i < 7; i += 1) qp = applyAnswer(qp, 'K', true, T1).progress;
    expect(qp.streak).toBe(5);
    expect(qp.correct).toBe(7);
  });

  it('remet le streak à 0 sur une mauvaise réponse', () => {
    const qp: QuestionProgress = { ...emptyQuestionProgress('K'), streak: 3, seen: 3, correct: 3 };
    expect(applyAnswer(qp, 'K', false, T1).progress.streak).toBe(0);
  });

  it('fait entrer la question dans la file sur une mauvaise réponse', () => {
    const r = applyAnswer(emptyQuestionProgress('K'), 'K', false, T1);
    expect(r.progress.inReview).toBe(true);
    expect(r.enteredQueue).toBe(true);
    expect(r.leftQueue).toBe(false);
  });

  it('ne signale pas une seconde entrée pour une question déjà dans la file', () => {
    const inQueue: QuestionProgress = { ...emptyQuestionProgress('K'), inReview: true };
    const r = applyAnswer(inQueue, 'K', false, T1);
    expect(r.enteredQueue).toBe(false);
    expect(r.progress.inReview).toBe(true);
  });

  it('garde la question dans la file après UNE seule bonne réponse', () => {
    const inQueue: QuestionProgress = { ...emptyQuestionProgress('K'), inReview: true, seen: 1 };
    const r = applyAnswer(inQueue, 'K', true, T1);
    expect(r.progress.streak).toBe(1);
    expect(r.progress.inReview).toBe(true);
    expect(r.leftQueue).toBe(false);
  });

  it('la sort à streak 2, et signale la sortie une seule fois', () => {
    const inQueue: QuestionProgress = {
      ...emptyQuestionProgress('K'),
      inReview: true,
      streak: 1,
      seen: 2,
    };
    const out = applyAnswer(inQueue, 'K', true, T1);
    expect(out.progress.streak).toBe(2);
    expect(out.progress.inReview).toBe(false);
    expect(out.leftQueue).toBe(true);

    const again = applyAnswer(out.progress, 'K', true, T2);
    expect(again.leftQueue).toBe(false);
  });

  it('laisse rentrer à nouveau une question déjà récupérée', () => {
    let qp = applyAnswer(emptyQuestionProgress('K'), 'K', false, T1).progress;
    qp = applyAnswer(qp, 'K', true, T2).progress;
    const recovered = applyAnswer(qp, 'K', true, T3);
    expect(recovered.leftQueue).toBe(true);

    const relapse = applyAnswer(recovered.progress, 'K', false, T3);
    expect(relapse.progress.inReview).toBe(true);
    expect(relapse.enteredQueue).toBe(true);
  });

  it('ne fait pas progresser le streak d’une question déjà créditée dans la session', () => {
    const inQueue: QuestionProgress = { ...emptyQuestionProgress('K'), inReview: true, streak: 1, seen: 2 };
    const r = applyAnswer(inQueue, 'K', true, T1, true);
    expect(r.progress.streak).toBe(1);
    expect(r.progress.correct).toBe(1);
    expect(r.progress.seen).toBe(3);
    expect(r.progress.inReview).toBe(true);
    expect(r.leftQueue).toBe(false);
  });

  it('remet quand même le streak à 0 sur une erreur après crédit', () => {
    const qp: QuestionProgress = { ...emptyQuestionProgress('K'), streak: 2, seen: 2, correct: 2 };
    expect(applyAnswer(qp, 'K', false, T1, true).progress.streak).toBe(0);
  });

  it('ne mute pas l’entrée', () => {
    const before = emptyQuestionProgress('K');
    const frozen = { ...before };
    applyAnswer(before, 'K', true, T1);
    expect(before).toEqual(frozen);
  });

  it('n’ajoute pas à la file une bonne réponse sur une question neuve', () => {
    const r = applyAnswer(emptyQuestionProgress('K'), 'K', true, T1);
    expect(r.progress.inReview).toBe(false);
    expect(r.enteredQueue).toBe(false);
  });
});

describe('reviewQueue', () => {
  const build = () => {
    const progress = progressWith();
    progress.questions = {
      A: { ...emptyQuestionProgress('A'), inReview: true, lastSeenAt: T3 },
      B: { ...emptyQuestionProgress('B'), inReview: true, lastSeenAt: T1 },
      C: { ...emptyQuestionProgress('C'), inReview: false, lastSeenAt: T2 },
      D: { ...emptyQuestionProgress('D'), inReview: true, lastSeenAt: T2 },
    };
    return progress;
  };

  it('ne retient que les questions marquées, les plus anciennes d’abord', () => {
    expect(reviewQueue(build()).map((q) => q.key)).toEqual(['B', 'D', 'A']);
  });

  it('compte la file', () => {
    expect(reviewQueueSize(build())).toBe(3);
    expect(reviewQueueSize(progressWith())).toBe(0);
  });
});

describe('compareByLastSeen', () => {
  const q = (key: string, lastSeenAt: string | null): QuestionProgress => ({
    ...emptyQuestionProgress(key),
    lastSeenAt,
  });

  it('place les dates nulles en tête', () => {
    expect(compareByLastSeen(q('A', null), q('B', T1))).toBeLessThan(0);
    expect(compareByLastSeen(q('A', T1), q('B', null))).toBeGreaterThan(0);
  });

  it('départage à égalité par la clé, pour un tri stable', () => {
    expect(compareByLastSeen(q('A', T1), q('B', T1))).toBeLessThan(0);
    expect(compareByLastSeen(q('B', T1), q('A', T1))).toBeGreaterThan(0);
    expect(compareByLastSeen(q('A', T1), q('A', T1))).toBe(0);
    expect(compareByLastSeen(q('A', null), q('A', null))).toBe(0);
  });

  it('trie deux dates', () => {
    expect(compareByLastSeen(q('A', T1), q('B', T2))).toBeLessThan(0);
    expect(compareByLastSeen(q('A', T2), q('B', T1))).toBeGreaterThan(0);
  });
});
