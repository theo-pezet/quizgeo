import { applyAnswerAction, applyCardReview, applyTick } from '../apply';
import {
  MAX_DAY_PENALTY,
  MAX_DEBT_MINUTES,
  MAX_SECONDS_PER_ANSWER,
  MAX_SETTLED_DAYS,
  STUDY_GEMS,
  acknowledgeStudyReport,
  creditStudy,
  lastWeekMinutes,
  nextPlannedSubject,
  setStudyGoal,
  settleStudy,
  studyPlan,
  studyTarget,
} from '../study';
import { emptyProgress, emptyStudy, type Exercise, type Progress } from '../types';

const D1 = '2026-11-20';
const D2 = '2026-11-21';
const D3 = '2026-11-22';

/** Une progression déjà ouverte le jour `day`, avec `gems` gemmes. */
function opened(day: string, gems = 500): Progress {
  return settleStudy({ ...emptyProgress(), gems }, day);
}

function study(p: Progress, minutes: number, day: string, subject = 'marketing'): Progress {
  let out = p;
  for (let s = minutes * 60; s > 0; s -= MAX_SECONDS_PER_ANSWER) out = creditStudy(out, subject, Math.min(MAX_SECONDS_PER_ANSWER, s), day).progress;
  return out;
}

describe('settleStudy', () => {
  it('ouvre le premier jour sans juger le passé', () => {
    const p = opened(D1);
    expect(p.study.day).toBe(D1);
    expect(p.study.settledThrough).toBe('2026-11-19');
    expect(p.gems).toBe(500);
    expect(p.study.report).toBeNull();
  });

  it('est idempotent et ignore une horloge reculée', () => {
    const p = opened(D2);
    expect(settleStudy(p, D2)).toBe(p);
    expect(settleStudy(p, D1)).toBe(p);
  });

  it('ne pénalise pas un jour où l’objectif est tenu', () => {
    const p = settleStudy(study(opened(D1), 90, D1), D2);
    expect(p.gems).toBe(500 + STUDY_GEMS.half + STUDY_GEMS.goal);
    expect(p.study.report).toBeNull();
    expect(p.study.history[D1]).toBe(90 * 60);
    expect(p.study.seconds).toBe(0);
  });

  it('pénalise un jour incomplet : gemmes, dette, série', () => {
    let p = study(opened(D1), 90, D1);
    p = settleStudy(p, D2);
    const gemsBefore = p.gems;
    p = study(p, 30, D2);
    p = settleStudy(p, D3);
    // 60 minutes manquantes : 40 gemmes, 20 minutes de dette, série perdue.
    expect(p.gems).toBe(gemsBefore - 40);
    expect(p.study.debtMinutes).toBe(20);
    expect(p.study.goalStreak).toBe(0);
    expect(p.study.report).toEqual({ missedDays: 1, missingMinutes: 60, gemsLost: 40, debtMinutes: 20, streakLost: 1 });
    expect(studyTarget(p.study)).toBe(110);
  });

  it('pénalise aussi les jours où l’appli n’a pas été ouverte, avec des plafonds', () => {
    const p = settleStudy(opened(D1, 10_000), '2026-12-20');
    expect(p.study.report?.missedDays).toBe(MAX_SETTLED_DAYS);
    expect(p.study.report?.gemsLost).toBe(MAX_SETTLED_DAYS * MAX_DAY_PENALTY);
    expect(p.study.debtMinutes).toBe(MAX_DEBT_MINUTES);
    // Pas de série à perdre.
    expect(p.study.report?.streakLost).toBe(0);
  });

  it('ne prend jamais plus de gemmes qu’il n’y en a', () => {
    const p = settleStudy(opened(D1, 5), D3);
    expect(p.gems).toBe(0);
    expect(p.study.report?.gemsLost).toBe(5);
  });

  it('efface la dette quand un jour la rattrape, et oublie le vieil historique', () => {
    let p = settleStudy(opened(D1), D2); // D1 vide : dette 30
    expect(p.study.debtMinutes).toBe(30);
    p = study(p, 120, D2);
    p = settleStudy(p, D3);
    expect(p.study.debtMinutes).toBe(0);
    p = settleStudy({ ...p, study: { ...p.study, history: { ...p.study.history, '2026-01-01': 60 } } }, '2026-11-23');
    expect(p.study.history['2026-01-01']).toBeUndefined();
  });

  it('garde un bilan non lu si rien de nouveau n’est manqué', () => {
    let p = settleStudy(opened(D1), D2);
    const report = p.study.report;
    p = study(p, 120, D2);
    p = settleStudy(p, D3);
    expect(p.study.report).toEqual(report);
    expect(acknowledgeStudyReport(p).study.report).toBeNull();
    const clean = acknowledgeStudyReport(p);
    expect(acknowledgeStudyReport(clean)).toBe(clean);
  });
});

describe('creditStudy', () => {
  it('plafonne chaque réponse et ignore le temps nul', () => {
    const p = opened(D1);
    expect(creditStudy(p, 'ia', 10_000, D1).progress.study.seconds).toBe(MAX_SECONDS_PER_ANSWER);
    const none = creditStudy(p, 'ia', -5, D1);
    expect(none.progress.study.seconds).toBe(0);
    expect(none.gems).toBe(0);
  });

  it('paie la moitié puis l’objectif, une fois par jour, et les paliers de série', () => {
    let p = opened(D1, 0);
    p = study(p, 44, D1);
    const half = creditStudy(p, 'ia', 60, D1);
    expect(half.halfReached).toBe(true);
    expect(half.gems).toBe(STUDY_GEMS.half);
    p = study(half.progress, 44, D1);
    const goal = creditStudy(p, 'ia', 120, D1);
    expect(goal.goalReached).toBe(true);
    expect(goal.gems).toBe(STUDY_GEMS.goal);
    expect(goal.progress.study.goalStreak).toBe(1);
    const again = creditStudy(goal.progress, 'ia', 120, D1);
    expect(again.goalReached || again.halfReached).toBe(false);
    expect(again.progress.study.bySubject.ia).toBe(60 + 120 + 120);

    let q: Progress = { ...opened(D1, 0), study: { ...emptyStudy(), day: D1, settledThrough: '2026-11-19', goalStreak: 6, bestGoalStreak: 6 } };
    q = study(q, 89, D1);
    const seventh = creditStudy(q, 'ia', 60, D1);
    expect(seventh.gems).toBe(STUDY_GEMS.goal + STUDY_GEMS.streakMilestones[7]);
    expect(seventh.progress.study.bestGoalStreak).toBe(7);
  });
});

describe('réglages et plan', () => {
  it('borne l’objectif', () => {
    expect(setStudyGoal(emptyProgress(), 5).study.goalMinutes).toBe(10);
    expect(setStudyGoal(emptyProgress(), 500).study.goalMinutes).toBe(240);
    expect(setStudyGoal(emptyProgress(), 60).study.goalMinutes).toBe(60);
  });

  it('répartit l’objectif selon les poids, matières inconnues comprises', () => {
    const s = { ...emptyStudy(), bySubject: { ia: 25 * 60 } };
    const plan = studyPlan(s, ['python', 'marketing', 'ia']);
    expect(plan.map((l) => l.subjectId)).toEqual(['marketing', 'ia', 'python']);
    expect(plan[0].targetMinutes).toBe(39);
    expect(plan[1].doneMinutes).toBe(25);
    expect(studyPlan(s, ['zzz'])[0].targetMinutes).toBe(90);
    expect(studyPlan(s, [])).toEqual([]);
    expect(nextPlannedSubject(plan)).toBe('marketing');
    expect(nextPlannedSubject([{ subjectId: 'a', targetMinutes: 5, doneMinutes: 5 }])).toBeNull();
    expect(nextPlannedSubject([{ subjectId: 'a', targetMinutes: 10, doneMinutes: 8 }, { subjectId: 'b', targetMinutes: 10, doneMinutes: 1 }])).toBe('b');
  });

  it('donne les 7 derniers jours', () => {
    const p = study(settleStudy(study(opened(D1), 10, D1), D2), 3, D2);
    const week = lastWeekMinutes(p.study, D2);
    expect(week).toHaveLength(7);
    expect(week[5]).toEqual({ day: D1, minutes: 10 });
    expect(week[6]).toEqual({ day: D2, minutes: 3 });
    expect(week[0].minutes).toBe(0);
  });
});

describe('intégration', () => {
  const q: Exercise = { kind: 'vf', key: 'u:x:1', unitId: 'u', prompt: 'p', isTrue: true, explain: '' } as unknown as Exercise;
  const now = new Date('2026-11-21T10:00:00');

  it('applyTick fait le bilan, une réponse et une carte créditent le temps', () => {
    expect(applyTick(emptyProgress(), now).study.day).toBe(D2);
    const r = applyAnswerAction(emptyProgress(), { question: q, correct: true, mode: 'review', chrono: false, now, creditedThisSession: false, studySeconds: 30, subjectId: 'ia' });
    expect(r.progress.study.bySubject.ia).toBe(30);
    expect(r.study.gems).toBe(0);
    const none = applyAnswerAction(emptyProgress(), { question: q, correct: true, mode: 'review', chrono: false, now, creditedThisSession: false });
    expect(none.progress.study.seconds).toBe(0);
    const noTime = applyAnswerAction(emptyProgress(), { question: q, correct: true, mode: 'review', chrono: false, now, creditedThisSession: false, subjectId: 'ia' });
    expect(noTime.study.goalReached).toBe(false);
    const card = applyCardReview(emptyProgress(), { cardId: 'c', grade: 'good', now, studySeconds: 20, subjectId: 'python' });
    expect(card.progress.study.bySubject.python).toBe(20);
  });
});
