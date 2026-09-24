/**
 * Le réducteur, testé de bout en bout : une réponse, une fin de session,
 * l'ouverture d'une source.
 */

import { applyAnswerAction, applyCardReview, applySessionEnd, applySourceOpened } from '../apply';
import { reviewQueueSize } from '../review';
import type { Exercise, Progress, SessionMode, UnitId } from '../types';
import { CATALOG, makeUnit, progressWith, withFirstTrait, withQuestionState } from './fixtures';

const UNIT: UnitId = 'seo-2';
const questions = makeUnit('seo-2', 4);
const easy = makeUnit('seo-1', 4);
const bank: Exercise[] = [...easy, ...questions];

const AT_19H = new Date(2026, 8, 9, 19, 30);
const AT_6H = new Date(2026, 8, 9, 6, 30);
const AT_23H = new Date(2026, 8, 9, 23, 30);

/** Le cycle 0,1,2,3,0,1,2,3,0,1 d'une session de 10 sur 4 questions. */
const tenOf = (unit: Exercise[]) => [0, 1, 2, 3, 0, 1, 2, 3, 0, 1].map((i) => unit[i]);

/**
 * Joue une suite de réponses comme le fera l'écran de session : un Set des
 * clés déjà créditées, passé à chaque réponse (contrat de AnswerAction).
 */
function play(
  start: Progress,
  order: Exercise[],
  isCorrect: (index: number) => boolean = () => true,
  mode: SessionMode = 'unit',
): Progress {
  const credited = new Set<string>();
  let p = start;
  order.forEach((question, index) => {
    const correct = isCorrect(index);
    p = applyAnswerAction(p, {
      question,
      correct,
      mode,
      chrono: false,
      now: AT_19H,
      creditedThisSession: credited.has(question.key),
    }).progress;
    if (correct) credited.add(question.key);
  });
  return p;
}

function endSession(
  progress: Progress,
  overrides: Partial<Parameters<typeof applySessionEnd>[1]> = {},
) {
  return applySessionEnd(progress, {
    mode: 'unit',
    unitId: UNIT,
    questionCount: 10,
    correctCount: 10,
    chrono: false,
    now: AT_19H,
    questions: bank,
    catalog: CATALOG,
    progressAtSessionStart: progress,
    ...overrides,
  });
}

const answer = {
  question: questions[0],
  correct: true,
  mode: 'unit' as const,
  chrono: false,
  now: AT_19H,
  creditedThisSession: false,
};

describe('applyAnswerAction', () => {
  it('crédite les XP et écrit la progression de la question', () => {
    const r = applyAnswerAction(progressWith(), answer);
    expect(r.xpGained).toBe(10);
    expect(r.progress.xp).toBe(10);
    expect(r.progress.questions[questions[0].key].streak).toBe(1);
  });

  it('ne crédite rien sur une mauvaise réponse et remplit la file', () => {
    const r = applyAnswerAction(progressWith(), { ...answer, correct: false });
    expect(r.xpGained).toBe(0);
    expect(r.progress.xp).toBe(0);
    expect(r.enteredQueue).toBe(true);
    expect(reviewQueueSize(r.progress)).toBe(1);
    expect(reviewQueueSize(r.progress, new Set<string>())).toBe(0);
  });

  it('double les XP en chrono', () => {
    const r = applyAnswerAction(progressWith(), { ...answer, mode: 'review', chrono: true });
    expect(r.xpGained).toBe(10);
  });

  it('compte la récupération quand la question sort de la file', () => {
    // Trois sessions distinctes : faux, puis juste, puis juste.
    let p = applyAnswerAction(progressWith(), { ...answer, correct: false }).progress;
    p = applyAnswerAction(p, { ...answer, mode: 'review' }).progress;
    const third = applyAnswerAction(p, { ...answer, mode: 'review' });
    expect(third.leftQueue).toBe(true);
    expect(third.progress.counters.reviewRecovered).toBe(1);
    expect(reviewQueueSize(third.progress)).toBe(0);
  });

  it('ne fait progresser le streak qu’une fois par session, mais crédite chaque bonne réponse', () => {
    const first = applyAnswerAction(progressWith(), answer);
    const again = applyAnswerAction(first.progress, { ...answer, creditedThisSession: true });
    const qp = again.progress.questions[questions[0].key];
    expect(again.xpGained).toBe(10);
    expect(again.progress.xp).toBe(20);
    expect(qp.streak).toBe(1);
    expect(qp.seen).toBe(2);
    expect(qp.correct).toBe(2);
  });

  it('ne sort pas de la file dans la session où la question y est entrée', () => {
    // Q0 : faux, juste, juste dans la même session → une seule progression.
    const order = [questions[0], questions[1], questions[0], questions[1], questions[0]];
    const p = play(progressWith(), order, (i) => i !== 0);
    expect(p.questions[questions[0].key].streak).toBe(1);
    expect(p.questions[questions[0].key].inReview).toBe(true);
    expect(p.counters.reviewRecovered).toBe(0);
  });

  it('compte toujours une erreur, même après une bonne réponse dans la session', () => {
    const p = play(progressWith(), [questions[0], questions[1], questions[0]], (i) => i !== 2);
    expect(p.questions[questions[0].key].streak).toBe(0);
    expect(p.questions[questions[0].key].inReview).toBe(true);
  });

  it('ne mute pas l’état d’entrée', () => {
    const before = progressWith();
    const snapshot = JSON.stringify(before);
    applyAnswerAction(before, answer);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('applySessionEnd', () => {
  it('ajoute les bonus de session sans doubler en chrono', () => {
    const plain = endSession(progressWith());
    expect(plain.xpGained).toBe(50); // 20 + 30

    const chrono = endSession(progressWith(), { chrono: true });
    expect(chrono.xpGained).toBe(50);
  });

  it('n’ajoute aucun bonus à une session de moins de 5 questions', () => {
    const r = endSession(progressWith(), {
      mode: 'review',
      unitId: null,
      questionCount: 3,
      correctCount: 3,
    });
    expect(r.xpGained).toBe(0);
  });

  it('incrémente les compteurs de session', () => {
    const r = endSession(progressWith());
    expect(r.progress.counters.sessionsCompleted).toBe(1);
    expect(r.progress.counters.perfectSessions).toBe(1);
    expect(r.progress.counters.chronoPerfects).toBe(0);
  });

  it('compte la session pour l’espacement des publicités', () => {
    const r = endSession(progressWith());
    expect(r.progress.ads.sessionsSinceLastAd).toBe(1);
    expect(endSession(r.progress).progress.ads.sessionsSinceLastAd).toBe(2);
  });

  it('compte un 10/10 chrono comme chronoPerfect', () => {
    const r = endSession(progressWith(), { chrono: true });
    expect(r.progress.counters.chronoPerfects).toBe(1);
  });

  it('reconnaît les sessions de l’aube et de la nuit', () => {
    expect(endSession(progressWith(), { now: AT_6H }).progress.counters.earlySessions).toBe(1);
    expect(endSession(progressWith(), { now: AT_23H }).progress.counters.nightSessions).toBe(1);
    expect(endSession(progressWith()).progress.counters.earlySessions).toBe(0);
  });

  it('met l’unité à jour et acquiert le premier trait', () => {
    const seen = withQuestionState(progressWith(), questions, { seen: 1, streak: 1 });
    const r = endSession(seen, { correctCount: 7 });
    expect(r.progress.units[UNIT].sessionsPlayed).toBe(1);
    expect(r.progress.units[UNIT].bestScore).toBe(7);
    expect(r.progress.units[UNIT].firstTraitEarned).toBe(true);
  });

  it('ne touche à aucune unité pour une session de révision', () => {
    const r = endSession(progressWith(), { mode: 'review', unitId: null, correctCount: 8 });
    expect(r.progress.units).toEqual({});
    expect(r.traitsBefore).toBe(0);
    expect(r.traitsAfter).toBe(0);
  });

  it('mesure le gain de trait depuis le lancement de la session, pour l’animation', () => {
    // Au lancement : 2 traits. Pendant la session, chaque question gagne un
    // cran de streak : 3 traits. Le « avant » doit valoir 2, pas 3.
    const start = withFirstTrait(
      withQuestionState(progressWith(), questions, { seen: 2, streak: 1 }),
      UNIT,
    );
    const afterAnswers = play(start, tenOf(questions));
    const r = endSession(afterAnswers, { progressAtSessionStart: start });
    expect(r.traitsBefore).toBe(2);
    expect(r.traitsAfter).toBe(3);
  });

  it('signale les unités ouvertes par la fin de session', () => {
    const p = withQuestionState(progressWith(), easy, { seen: 1, streak: 0 });
    const r = endSession(p, { unitId: 'seo-1', correctCount: 8 });
    expect(r.newlyUnlockedUnits).toEqual(['seo-2']);
  });

  it('signale aussi les unités ouvertes PENDANT les réponses', () => {
    // Quatre bonnes réponses sur Facile suffisent à lui donner 2 traits, donc
    // à ouvrir Moyen avant même la fin de session. Mesuré depuis l'état de
    // fin, ce déverrouillage passerait inaperçu et son animation ne serait
    // jamais jouée.
    const start = progressWith();
    const afterAnswers = play(start, tenOf(easy));
    const r = endSession(afterAnswers, {
      unitId: 'seo-1',
      progressAtSessionStart: start,
    });
    expect(r.traitsBefore).toBe(0);
    expect(r.traitsAfter).toBe(2);
    expect(r.newlyUnlockedUnits).toEqual(['seo-2']);
  });

  it('nourrit la série et annonce le passage de niveau', () => {
    const p = { ...progressWith(), xp: 60 };
    const r = endSession(p);
    expect(r.progress.streak.current).toBe(1);
    expect(r.progress.streak.lastActiveDay).toBe('2026-09-09');
    expect(r.levelUp).toEqual({ crossed: true, from: 1, to: 2 });
  });

  it('mesure le passage de niveau depuis le début de session', () => {
    const p = { ...progressWith(), xp: 280 };
    const r = endSession(p, { progressAtSessionStart: { ...p, xp: 180 } });
    expect(r.levelUp).toEqual({ crossed: true, from: 2, to: 3 });
  });

  it('ne nourrit pas la série avec une session trop courte', () => {
    const r = endSession(progressWith(), {
      mode: 'review',
      unitId: null,
      questionCount: 4,
      correctCount: 4,
    });
    expect(r.progress.streak.current).toBe(0);
    expect(r.progress.streak.lastActiveDay).toBeNull();
    expect(r.streakIncremented).toBe(false);
    expect(r.freezeConsumedFor).toBeNull();
  });

  it('consomme un gel et le rapporte', () => {
    const p = progressWith();
    p.streak = {
      current: 4,
      best: 4,
      lastActiveDay: '2026-09-07',
      freezes: 1,
      freezeUsedOn: [],
    };
    const r = endSession(p);
    expect(r.freezeConsumedFor).toBe('2026-09-08');
    expect(r.streakIncremented).toBe(true);
  });

  it('décerne les badges de la session qui vient de les mériter', () => {
    const r = endSession(progressWith());
    expect(r.newBadges).toEqual(['first_session', 'perfect']);
    expect(r.progress.badges.perfect).toBe(AT_19H.toISOString());
  });

  it('ne redécerne pas un badge au tour suivant', () => {
    const first = endSession(progressWith());
    const second = endSession(first.progress);
    expect(second.newBadges).toEqual([]);
  });

  it('traite une unité inconnue du catalogue et de la banque sans exploser', () => {
    const r = endSession(progressWith(), { unitId: 'hors-catalogue-1', questions: bank });
    expect(r.traitsBefore).toBe(0);
    expect(r.traitsAfter).toBe(0);
    expect(r.progress.units['hors-catalogue-1'].sessionsPlayed).toBe(1);
  });
});

describe('applyCardReview', () => {
  it('crédite 5 XP pour « Bien » et planifie la carte', () => {
    const r = applyCardReview(progressWith(), { cardId: 'marketing-seo', grade: 'good', now: AT_19H });
    expect(r.correct).toBe(true);
    expect(r.xpGained).toBe(5);
    expect(r.progress.xp).toBe(5);
    expect(r.progress.cards['marketing-seo']).toMatchObject({ phase: 'learning', due: '2026-09-10' });
    expect(r.progress.counters.cardsReviewed).toBe(1);
  });

  it('ne crédite rien pour « Encore » mais compte la révision', () => {
    const r = applyCardReview(progressWith(), { cardId: 'marketing-seo', grade: 'again', now: AT_19H });
    expect(r.correct).toBe(false);
    expect(r.xpGained).toBe(0);
    expect(r.progress.cards['marketing-seo'].due).toBe('2026-09-09');
    expect(r.progress.counters.cardsReviewed).toBe(1);
  });
});

describe('applySourceOpened', () => {
  it('compte les ouvertures', () => {
    const r = applySourceOpened(progressWith(), bank, CATALOG, AT_19H);
    expect(r.progress.counters.sourcesOpened).toBe(1);
    expect(r.newBadges).toEqual([]);
  });

  it('décerne « Lecteur » à la dixième', () => {
    let p = progressWith();
    let last = applySourceOpened(p, bank, CATALOG, AT_19H);
    for (let i = 1; i < 10; i += 1) last = applySourceOpened(last.progress, bank, CATALOG, AT_19H);
    expect(last.progress.counters.sourcesOpened).toBe(10);
    expect(last.newBadges).toEqual(['reader']);
    expect(last.progress.badges.reader).toBe(AT_19H.toISOString());
    p = last.progress;
    expect(applySourceOpened(p, bank, CATALOG, AT_19H).newBadges).toEqual([]);
  });
});

describe('un parcours complet', () => {
  it('un premier 10/10 donne 2 traits, pas 3 : la maîtrise demande de revenir', () => {
    const start = progressWith();
    const p = play(start, tenOf(questions));
    expect(p.xp).toBe(100); // les répétitions rapportent toujours des XP

    const end = applySessionEnd(p, {
      mode: 'unit',
      unitId: UNIT,
      questionCount: 10,
      correctCount: 10,
      chrono: false,
      now: AT_19H,
      questions: bank,
      catalog: CATALOG,
      progressAtSessionStart: start,
    });

    expect(end.progress.xp).toBe(150);
    expect(end.levelUp).toEqual({ crossed: true, from: 1, to: 2 });
    expect(end.traitsBefore).toBe(0);
    expect(end.traitsAfter).toBe(2);
    expect(end.progress.units[UNIT].perfect).toBe(true);
    expect(end.progress.streak.current).toBe(1);
    expect(end.newBadges).toEqual(['first_session', 'perfect']);
    expect(reviewQueueSize(end.progress)).toBe(0);
  });

  it('une deuxième session sans faute apporte le 3e trait et le badge Trois couronnes', () => {
    const first = play(progressWith(), tenOf(questions));
    const afterFirst = endSession(first, { progressAtSessionStart: progressWith() }).progress;

    const second = play(afterFirst, tenOf(questions));
    const end = endSession(second, { progressAtSessionStart: afterFirst });
    expect(end.traitsBefore).toBe(2);
    expect(end.traitsAfter).toBe(3);
    expect(end.newBadges).toEqual(['highlighter']);
  });
});
