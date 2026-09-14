import { emptyProgress } from '../types';
import { applySessionEnd } from '../apply';
import { catalogFrom } from '../types';
import { MONTHLY_REWARD, MONTHLY_TARGET, emptyMonthly, ensureMonthly, monthOf, monthlyRatio, recordMonthlyLesson } from '../monthly';

describe('le défi du mois', () => {
  it('lit le mois d’un jour', () => {
    expect(monthOf('2026-09-14')).toBe('2026-09');
  });

  it('repart à zéro quand le mois change, en gardant les médailles', () => {
    const s = { ...emptyMonthly(), month: '2026-08', lessons: 12, claimed: true, medals: ['2026-08'] };
    expect(ensureMonthly(s, '2026-08-30')).toBe(s);
    expect(ensureMonthly(s, '2026-09-01')).toEqual({ month: '2026-09', lessons: 0, claimed: false, medals: ['2026-08'] });
  });

  it('compte les leçons et décerne la médaille à la vingtième, une seule fois', () => {
    let s = emptyMonthly();
    for (let i = 0; i < MONTHLY_TARGET - 1; i++) s = recordMonthlyLesson(s, '2026-09-14').state;
    expect(s.lessons).toBe(MONTHLY_TARGET - 1);
    expect(monthlyRatio(s)).toBeCloseTo((MONTHLY_TARGET - 1) / MONTHLY_TARGET);
    const done = recordMonthlyLesson(s, '2026-09-15');
    expect(done.completed).toBe(true);
    expect(done.state.medals).toEqual(['2026-09']);
    const again = recordMonthlyLesson(done.state, '2026-09-16');
    expect(again.completed).toBe(false);
    expect(again.state.lessons).toBe(MONTHLY_TARGET + 1);
    expect(monthlyRatio(again.state)).toBe(1);
  });

  it('ne duplique pas une médaille déjà présente', () => {
    const s = { ...emptyMonthly(), month: '2026-09', lessons: MONTHLY_TARGET - 1, claimed: false, medals: ['2026-09'] };
    expect(recordMonthlyLesson(s, '2026-09-20').state.medals).toEqual(['2026-09']);
  });

  it('est nourri par une leçon complète en fin de session, avec 100 gemmes', () => {
    const catalog = catalogFrom([{ id: 'u', subjectId: 's' }]);
    const base = emptyProgress();
    const progress = { ...base, monthly: { month: '2026-09', lessons: MONTHLY_TARGET - 1, claimed: false, medals: [] }, daily: { ...base.daily, goal: 100000 } };
    const now = new Date('2026-09-14T10:00:00');
    const r = applySessionEnd(progress, { mode: 'unit', unitId: 'u', questionCount: 10, correctCount: 10, chrono: false, now, questions: [], catalog, progressAtSessionStart: progress });
    expect(r.monthlyCompleted).toBe(true);
    expect(r.progress.monthly.medals).toEqual(['2026-09']);
    expect(r.progress.gems - progress.gems).toBeGreaterThanOrEqual(MONTHLY_REWARD);
    const short = applySessionEnd(progress, { mode: 'unit', unitId: 'u', questionCount: 2, correctCount: 2, chrono: false, now, questions: [], catalog, progressAtSessionStart: progress });
    expect(short.monthlyCompleted).toBe(false);
  });
});
