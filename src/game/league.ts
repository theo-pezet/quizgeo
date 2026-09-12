/**
 * La ligue hebdomadaire : 30 joueurs, 10 divisions, promotion des 7 premiers
 * et relégation des 5 derniers chaque lundi.
 *
 * HORS LIGNE : les 29 adversaires sont SIMULÉS, dérivés d'une graine
 * hebdomadaire. Leur XP progresse au fil des jours selon un rythme propre à
 * chacun, plus soutenu dans les divisions hautes. Le jour où un service en
 * ligne fournira de vrais adversaires, seul `opponents()` change : les
 * règles de classement et de promotion restent les mêmes.
 */

import { addDays, daysBetween } from './dates';
import { mulberry32, hashString } from './random';
import type { DayKey, LeagueOutcome, LeagueResult, LeagueState } from './types';

export const LEAGUE_TIERS = [
  'Bronze',
  'Argent',
  'Or',
  'Saphir',
  'Rubis',
  'Émeraude',
  'Améthyste',
  'Perle',
  'Obsidienne',
  'Diamant',
] as const;

export const LEAGUE_SIZE = 30;
export const PROMOTION_ZONE = 7;
export const DEMOTION_ZONE = 5;
export const LEAGUE_DAYS = 7;
export const MAX_HISTORY = 12;

const FIRST_NAMES = [
  'Léa', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Lucas', 'Emma', 'Enzo', 'Inès', 'Louis',
  'Jade', 'Gabriel', 'Camille', 'Raphaël', 'Sarah', 'Arthur', 'Zoé', 'Adam', 'Lina', 'Jules',
  'Alice', 'Tom', 'Anna', 'Noah', 'Eva', 'Liam', 'Rose', 'Sacha', 'Mila', 'Ethan',
  'Nina', 'Théo', 'Lola', 'Maxime', 'Clara', 'Léo', 'Julia', 'Paul', 'Louna', 'Axel',
  'Maya', 'Samuel', 'Iris', 'Rayan', 'Ambre', 'Victor', 'Élise', 'Mathis', 'Agathe', 'Yanis',
];

/** Le lundi de la semaine qui contient `day`. */
export function weekKeyOf(day: DayKey): DayKey {
  const [y, m, d] = day.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche
  const back = (dow + 6) % 7;
  return addDays(day, -back);
}

export function daysLeftInWeek(state: LeagueState, today: DayKey): number {
  if (state.weekKey === null) return LEAGUE_DAYS;
  return Math.max(0, LEAGUE_DAYS - daysBetween(state.weekKey, today));
}

export interface Competitor {
  name: string;
  xp: number;
  isUser: boolean;
}

interface Opponent {
  name: string;
  /** XP par jour, avec une part d'irrégularité. */
  rate: number;
  jitter: number;
}

function opponents(seed: number, tier: number): Opponent[] {
  const rng = mulberry32(seed);
  const names = [...FIRST_NAMES];
  const out: Opponent[] = [];
  const base = 60 + tier * 40;
  for (let i = 0; i < LEAGUE_SIZE - 1; i += 1) {
    const idx = Math.floor(rng() * names.length);
    const [first] = names.splice(idx, 1);
    const initial = String.fromCharCode(65 + Math.floor(rng() * 26));
    out.push({ name: `${first} ${initial}.`, rate: base * (0.3 + 1.7 * rng()), jitter: rng() });
  }
  return out;
}

/** XP d'un adversaire après `days` jours de la semaine (1..7). */
function opponentXp(o: Opponent, days: number): number {
  const d = Math.max(0, Math.min(LEAGUE_DAYS, days));
  // Une courbe légèrement irrégulière, mais croissante et déterministe.
  const wobble = 0.85 + 0.3 * Math.abs(Math.sin(o.jitter * 7 + d));
  return Math.floor(o.rate * d * wobble);
}

function elapsedDays(state: LeagueState, today: DayKey): number {
  if (state.weekKey === null) return 1;
  return Math.max(1, Math.min(LEAGUE_DAYS, daysBetween(state.weekKey, today) + 1));
}

/** Le classement complet, meilleur XP en tête ; l'utilisateur est marqué. */
export function leagueStandings(state: LeagueState, today: DayKey): Competitor[] {
  const days = elapsedDays(state, today);
  const list: Competitor[] = opponents(state.seed, state.tier).map((o) => ({
    name: o.name,
    xp: opponentXp(o, days),
    isUser: false,
  }));
  list.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  // À XP égal, l'utilisateur passe devant : on ne le relègue pas sur une égalité.
  let at = list.findIndex((c) => c.xp <= state.xpThisWeek);
  if (at === -1) at = list.length;
  list.splice(at, 0, { name: 'Toi', xp: state.xpThisWeek, isUser: true });
  return list;
}

export function userRank(state: LeagueState, today: DayKey): number {
  return leagueStandings(state, today).findIndex((c) => c.isUser) + 1;
}

export function resultForRank(rank: number, tier: number): LeagueResult {
  if (rank <= PROMOTION_ZONE && tier < LEAGUE_TIERS.length - 1) return 'promoted';
  if (rank > LEAGUE_SIZE - DEMOTION_ZONE && tier > 0) return 'demoted';
  return 'stayed';
}

/**
 * Garantit que la ligue est celle de la semaine de `today`. Si une semaine
 * s'est terminée, elle est jugée sur son classement final (7 jours) et le
 * bilan est mis en attente d'affichage. Idempotent dans la même semaine.
 */
export function ensureLeague(state: LeagueState, today: DayKey): LeagueState {
  const week = weekKeyOf(today);
  if (state.weekKey === week) return state;

  if (state.weekKey === null) {
    return { ...state, weekKey: week, seed: hashString(`league:${week}:${state.tier}`), xpThisWeek: 0 };
  }

  // Bilan de la semaine écoulée, sur son dernier jour.
  const lastDay = addDays(state.weekKey, LEAGUE_DAYS - 1);
  const rank = userRank(state, lastDay);
  const result = resultForRank(rank, state.tier);
  const newTier = state.tier + (result === 'promoted' ? 1 : result === 'demoted' ? -1 : 0);
  const outcome: LeagueOutcome = { weekKey: state.weekKey, tier: state.tier, rank, result, newTier };

  return {
    tier: newTier,
    weekKey: week,
    seed: hashString(`league:${week}:${newTier}`),
    xpThisWeek: 0,
    pendingOutcome: outcome,
    history: [outcome, ...state.history].slice(0, MAX_HISTORY),
  };
}

export function addLeagueXp(state: LeagueState, amount: number): LeagueState {
  return { ...state, xpThisWeek: state.xpThisWeek + Math.max(0, amount) };
}

export function clearLeagueOutcome(state: LeagueState): LeagueState {
  return { ...state, pendingOutcome: null };
}
