import { MAX_ENERGY } from '../energy';
import { DEFAULT_REMINDER_PREFS, planReminders } from '../reminders';
import { progressWith } from './fixtures';

const MORNING = new Date(2026, 8, 9, 9, 0);
const EVENING = new Date(2026, 8, 9, 21, 0);

describe('planReminders — série', () => {
  it('rappelle ce soir à 19 h quand la journée n’est pas encore active', () => {
    const r = planReminders(progressWith(), MORNING, DEFAULT_REMINDER_PREFS);
    const streak = r.find((x) => x.id === 'streak');
    expect(streak?.at).toEqual(new Date(2026, 8, 9, 19, 0));
    expect(streak?.title).toContain('Une leçon');
  });

  it('reporte à demain quand la journée est active, ou quand l’heure est passée', () => {
    const p = progressWith();
    p.streak = { current: 4, best: 4, lastActiveDay: '2026-09-09', freezes: 0, freezeUsedOn: [] };
    const active = planReminders(p, MORNING, DEFAULT_REMINDER_PREFS).find((x) => x.id === 'streak');
    expect(active?.at).toEqual(new Date(2026, 8, 10, 19, 0));
    expect(active?.title).toContain('4 jours');

    const late = planReminders(progressWith(), EVENING, DEFAULT_REMINDER_PREFS).find((x) => x.id === 'streak');
    expect(late?.at).toEqual(new Date(2026, 8, 10, 19, 0));
  });

  it('respecte l’heure choisie et le désactivation', () => {
    const r = planReminders(progressWith(), MORNING, { ...DEFAULT_REMINDER_PREFS, streakHour: 8 });
    expect(r.find((x) => x.id === 'streak')?.at).toEqual(new Date(2026, 8, 10, 8, 0));
    expect(planReminders(progressWith(), MORNING, { ...DEFAULT_REMINDER_PREFS, streak: false }).some((x) => x.id === 'streak')).toBe(false);
  });

  it('accorde le singulier', () => {
    const p = progressWith();
    p.streak = { current: 1, best: 1, lastActiveDay: '2026-09-08', freezes: 0, freezeUsedOn: [] };
    expect(planReminders(p, MORNING, DEFAULT_REMINDER_PREFS)[0].title).toContain('1 jour ');
  });
});

describe('planReminders — énergie', () => {
  it('ne rappelle rien quand l’énergie est pleine', () => {
    expect(planReminders(progressWith(), MORNING, DEFAULT_REMINDER_PREFS).some((x) => x.id === 'energy')).toBe(false);
  });

  it('programme le rappel au moment du plein', () => {
    const p = progressWith();
    p.energy = { value: MAX_ENERGY - 2, updatedAt: MORNING.toISOString() };
    const energy = planReminders(p, MORNING, DEFAULT_REMINDER_PREFS).find((x) => x.id === 'energy');
    expect(energy?.at).toEqual(new Date(MORNING.getTime() + 24 * 60000));
  });

  it('se désactive', () => {
    const p = progressWith();
    p.energy = { value: 3, updatedAt: MORNING.toISOString() };
    expect(planReminders(p, MORNING, { ...DEFAULT_REMINDER_PREFS, energy: false }).some((x) => x.id === 'energy')).toBe(false);
  });
});

describe('planReminders — relances', () => {
  const at = (day: string, hour: number) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d, hour, 0, 0, 0);
  };

  it('programme les relances à venir (3, 7, 14 jours) après la dernière session', () => {
    const p = progressWith();
    p.streak = { ...p.streak, current: 2, lastActiveDay: '2026-09-10' };
    const now = at('2026-09-15', 10);
    const ids = planReminders(p, now, DEFAULT_REMINDER_PREFS).map((r) => r.id);
    expect(ids).toContain('lapse-7');
    expect(ids).toContain('lapse-14');
    expect(ids).not.toContain('lapse-3');
    const seven = planReminders(p, now, DEFAULT_REMINDER_PREFS).find((r) => r.id === 'lapse-7');
    expect(seven?.at).toEqual(at('2026-09-17', DEFAULT_REMINDER_PREFS.streakHour));
    expect(seven?.title).toContain('7');
  });

  it('ne relance pas sans historique, ni quand la journée est déjà active, ni si les rappels de série sont coupés', () => {
    const fresh = progressWith();
    expect(planReminders(fresh, at('2026-09-15', 10), DEFAULT_REMINDER_PREFS).some((r) => r.id.startsWith('lapse'))).toBe(false);
    const active = progressWith();
    active.streak = { ...active.streak, current: 1, lastActiveDay: '2026-09-15' };
    expect(planReminders(active, at('2026-09-15', 10), DEFAULT_REMINDER_PREFS).some((r) => r.id.startsWith('lapse'))).toBe(false);
    const off = progressWith();
    off.streak = { ...off.streak, current: 1, lastActiveDay: '2026-09-10' };
    expect(planReminders(off, at('2026-09-15', 10), { ...DEFAULT_REMINDER_PREFS, streak: false }).some((r) => r.id.startsWith('lapse'))).toBe(false);
  });

  it('n’annonce pas « en jeu » une série déjà perdue', () => {
    const p = progressWith();
    p.streak = { current: 12, best: 12, lastActiveDay: '2026-09-01', freezes: 0, freezeUsedOn: [] };
    const streak = planReminders(p, at('2026-09-09', 10), DEFAULT_REMINDER_PREFS).find((r) => r.id === 'streak');
    expect(streak?.title).toContain('Une leçon');
    expect(streak?.title).not.toContain('12');
  });

  it('garde « en jeu » une série qu’un gel peut encore sauver', () => {
    const p = progressWith();
    p.streak = { current: 12, best: 12, lastActiveDay: '2026-09-07', freezes: 1, freezeUsedOn: [] };
    const streak = planReminders(p, at('2026-09-09', 10), DEFAULT_REMINDER_PREFS).find((r) => r.id === 'streak');
    expect(streak?.title).toContain('12 jours');
  });

  it('juge la série au jour du rappel, pas au jour de la programmation', () => {
    // Dernière session hier, programmé ce soir après 19 h : le rappel de demain
    // tombe à J+2, la série sera perdue sans gel.
    const p = progressWith();
    p.streak = { current: 5, best: 5, lastActiveDay: '2026-09-08', freezes: 0, freezeUsedOn: [] };
    const streak = planReminders(p, at('2026-09-09', 21), DEFAULT_REMINDER_PREFS).find((r) => r.id === 'streak');
    expect(streak?.at).toEqual(at('2026-09-10', 19));
    expect(streak?.title).toContain('Une leçon');
  });

  it('n’envoie jamais deux notifications à la même minute (série et relance)', () => {
    const p = progressWith();
    p.streak = { current: 12, best: 12, lastActiveDay: '2026-09-06', freezes: 0, freezeUsedOn: [] };
    // Trois jours après, le matin : la relance « 3 jours » tombe ce soir.
    const morning = planReminders(p, at('2026-09-09', 10), DEFAULT_REMINDER_PREFS);
    expect(morning.some((r) => r.id === 'streak')).toBe(false);
    expect(morning.find((r) => r.id === 'lapse-3')?.at).toEqual(at('2026-09-09', 19));
    // J+2 après 19 h : série et relance tomberaient toutes deux demain à 19 h.
    const late = planReminders(p, at('2026-09-08', 21), DEFAULT_REMINDER_PREFS);
    expect(late.some((r) => r.id === 'streak')).toBe(false);
    expect(late.filter((r) => r.at.getTime() === at('2026-09-09', 19).getTime())).toHaveLength(1);
  });
});
