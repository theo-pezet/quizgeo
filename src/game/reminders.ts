/**
 * Les rappels — la RÈGLE, pas le système de notifications.
 *
 * Ce module décide QUOI rappeler et QUAND, depuis l'état ; src/lib/notifications.ts
 * les programme sur le téléphone (et ne fait rien sur le web). Deux rappels :
 * la série en danger, en fin de journée ; l'énergie revenue à plein.
 */

import { addDays, toDayKey } from './dates';
import { MAX_ENERGY, currentEnergy, minutesToNextEnergy, ENERGY_REGEN_MINUTES } from './energy';
import { displayedStreak, isActiveToday } from './streak';
import type { Progress } from './types';

export interface Reminder {
  id: 'streak' | 'energy' | 'lapse-3' | 'lapse-7' | 'lapse-14';
  at: Date;
  title: string;
  body: string;
}

export interface ReminderPrefs {
  streak: boolean;
  energy: boolean;
  /** Heure locale du rappel de série, 0..23. */
  streakHour: number;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { streak: true, energy: true, streakHour: 19 };

/** Les textes des rappels : l'interface les fournit dans la langue de l'utilisateur. */
export interface ReminderTexts {
  streakTitle: (current: number) => string;
  streakBody: (current: number) => string;
  energyTitle: string;
  energyBody: string;
  /** Relance après `days` jours sans session (3, 7, 14). */
  lapseTitle: (days: number) => string;
  lapseBody: (days: number) => string;
}

export const DEFAULT_REMINDER_TEXTS: ReminderTexts = {
  streakTitle: (current) => (current > 0 ? `🔥 Série de ${current} jour${current > 1 ? 's' : ''} en jeu` : '🔥 Une leçon aujourd’hui ?'),
  streakBody: (current) => (current > 0 ? 'Une session de 5 exercices avant minuit et la série continue.' : 'Cinq minutes suffisent pour démarrer une série.'),
  energyTitle: '⚡ Énergie rechargée',
  energyBody: 'Tes 25 points sont revenus : cinq leçons t’attendent.',
  lapseTitle: (days) => `Ça fait ${days} jours…`,
  lapseBody: () => 'Cinq minutes suffisent pour reprendre là où tu t’étais arrêté.',
};

/** Jours d'inactivité après lesquels on relance. */
export const LAPSE_DAYS = [3, 7, 14] as const;

function dayAt(day: string, hour: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

function atHour(base: Date, hour: number, daysAhead: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysAhead, hour, 0, 0, 0);
  return d;
}

/** Les rappels à programmer à partir de `now`. Toujours dans le futur. */
export function planReminders(progress: Progress, now: Date, prefs: ReminderPrefs, texts: ReminderTexts = DEFAULT_REMINDER_TEXTS): Reminder[] {
  const out: Reminder[] = [];
  const today = toDayKey(now);

  // Relances : 3, 7 et 14 jours après la dernière session, seulement celles à venir.
  const lapses: Reminder[] = [];
  if (prefs.streak && progress.streak.lastActiveDay && !isActiveToday(progress.streak, today)) {
    for (const days of LAPSE_DAYS) {
      const at = dayAt(addDays(progress.streak.lastActiveDay, days), prefs.streakHour);
      if (at.getTime() <= now.getTime()) continue;
      lapses.push({ id: `lapse-${days}` as Reminder['id'], at, title: texts.lapseTitle(days), body: texts.lapseBody(days) });
    }
  }

  if (prefs.streak) {
    const active = isActiveToday(progress.streak, today);
    const todayAt = atHour(now, prefs.streakHour, 0);
    const at = !active && todayAt.getTime() > now.getTime() ? todayAt : atHour(now, prefs.streakHour, 1);
    const day = toDayKey(at);
    // Une relance tombe le même jour à la même heure : elle suffit, pas deux notifications.
    if (!lapses.some((l) => toDayKey(l.at) === day)) {
      // La série telle qu'elle sera ce jour-là : 0 si elle est déjà perdue,
      // pour ne jamais annoncer « en jeu » une série que la session remettra à 1.
      const current = displayedStreak(progress.streak, day);
      out.push({
        id: 'streak',
        at,
        title: texts.streakTitle(current),
        body: texts.streakBody(current),
      });
    }
  }
  out.push(...lapses);

  if (prefs.energy) {
    const value = currentEnergy(progress.energy, now);
    if (value < MAX_ENERGY) {
      const minutes = minutesToNextEnergy(progress.energy, now) + (MAX_ENERGY - value - 1) * ENERGY_REGEN_MINUTES;
      out.push({
        id: 'energy',
        at: new Date(now.getTime() + minutes * 60000),
        title: texts.energyTitle,
        body: texts.energyBody,
      });
    }
  }

  return out;
}
