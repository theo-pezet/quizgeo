/**
 * Les badges.
 *
 * Chaque condition est une fonction de l'état `Progress` (plus les traits
 * calculés, qui en dérivent). Aucune ne reçoit quoi que ce soit de l'interface.
 * L'obtention est irréversible : un badge présent dans `progress.badges` n'est
 * jamais réévalué.
 */

import { allSubjectsComplete, isSubjectComplete } from './mastery';
import { subjectIds, type Catalog, type IsoDate, type Progress, type Traits } from './types';

export type BadgeId =
  | 'first_session'
  | 'perfect'
  | 'highlighter'
  | 'chapter'
  | 'encyclopedia'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'early'
  | 'night'
  | 'corrector'
  | 'chrono'
  | 'reader'
  | 'regular'
  | 'legendary'
  | 'quests_10'
  | 'league_gold'
  | 'goal_7';

export interface BadgeContext {
  progress: Progress;
  traitsByUnit: Record<string, Traits>;
  catalog: Catalog;
}

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  condition: (ctx: BadgeContext) => boolean;
}

/** Ordre d'affichage des feuilles quand plusieurs badges tombent d'un coup. */
export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first_session',
    name: 'Premier pas',
    condition: ({ progress }) => progress.counters.sessionsCompleted >= 1,
  },
  {
    id: 'perfect',
    name: 'Sans faute',
    condition: ({ progress }) => progress.counters.perfectSessions >= 1,
  },
  {
    id: 'highlighter',
    name: 'Trois couronnes',
    condition: ({ traitsByUnit }) => Object.values(traitsByUnit).some((t) => t >= 3),
  },
  {
    id: 'chapter',
    name: 'Chapitre clos',
    condition: ({ traitsByUnit, catalog }) =>
      subjectIds(catalog).some((id) => isSubjectComplete(id, traitsByUnit, catalog)),
  },
  {
    id: 'encyclopedia',
    name: 'Encyclopédie',
    condition: ({ traitsByUnit, catalog }) => allSubjectsComplete(traitsByUnit, catalog),
  },
  {
    id: 'streak_3',
    name: 'Trois jours',
    condition: ({ progress }) => progress.streak.best >= 3,
  },
  {
    id: 'streak_7',
    name: 'Une semaine',
    condition: ({ progress }) => progress.streak.best >= 7,
  },
  {
    id: 'streak_30',
    name: 'Un mois',
    condition: ({ progress }) => progress.streak.best >= 30,
  },
  {
    id: 'early',
    name: 'Lève-tôt',
    condition: ({ progress }) => progress.counters.earlySessions >= 1,
  },
  {
    id: 'night',
    name: 'Noctambule',
    condition: ({ progress }) => progress.counters.nightSessions >= 1,
  },
  {
    id: 'corrector',
    name: 'Correcteur',
    condition: ({ progress }) => progress.counters.reviewRecovered >= 20,
  },
  {
    id: 'chrono',
    name: 'Chronomètre',
    condition: ({ progress }) => progress.counters.chronoPerfects >= 1,
  },
  {
    id: 'reader',
    name: 'Lecteur',
    condition: ({ progress }) => progress.counters.sourcesOpened >= 10,
  },
  {
    id: 'regular',
    name: 'Fidèle',
    condition: ({ progress }) => progress.counters.sessionsCompleted >= 100,
  },
  {
    id: 'legendary',
    name: 'Légendaire',
    condition: ({ traitsByUnit }) => Object.values(traitsByUnit).some((t) => t === 5),
  },
  {
    id: 'quests_10',
    name: 'Chasseur de quêtes',
    condition: ({ progress }) => progress.counters.questsCompleted >= 10,
  },
  {
    id: 'league_gold',
    name: 'Ligue Or',
    condition: ({ progress }) => progress.league.tier >= 2,
  },
  {
    id: 'goal_7',
    name: 'Objectif ×7',
    condition: ({ progress }) => progress.counters.goalDays >= 7,
  },
];

export const BADGE_IDS: readonly BadgeId[] = BADGES.map((b) => b.id);

/** Badges nouvellement obtenus, dans l'ordre d'enchaînement des feuilles. */
export function evaluateBadges(ctx: BadgeContext): BadgeId[] {
  return BADGES.filter(
    (badge) => ctx.progress.badges[badge.id] === undefined && badge.condition(ctx),
  ).map((badge) => badge.id);
}

/** Inscrit les badges obtenus. Ne réécrit jamais une date déjà posée. */
export function awardBadges(
  badges: Record<string, IsoDate>,
  earned: readonly BadgeId[],
  now: IsoDate,
): Record<string, IsoDate> {
  const out = { ...badges };
  for (const id of earned) if (out[id] === undefined) out[id] = now;
  return out;
}

/** Heure locale « Lève-tôt » : 5 h ≤ h < 8 h. */
export function isEarlyHour(hour: number): boolean {
  return hour >= 5 && hour < 8;
}

/** Heure locale « Noctambule » : 23 h ≤ h < 2 h, à cheval sur minuit. */
export function isNightHour(hour: number): boolean {
  return hour >= 23 || hour < 2;
}
