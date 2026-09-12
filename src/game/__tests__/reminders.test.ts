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
