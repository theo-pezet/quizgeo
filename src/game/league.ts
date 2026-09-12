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
  /** Un des trois rivaux qu'on retrouve chaque semaine. */
  rival: boolean;
}

interface Opponent {
  name: string;
  /** XP par jour, avec une part d'irrégularité. */
  rate: number;
  jitter: number;
  rival: boolean;
}

export const RIVALS = 3;

/** Le rythme moyen d'une division, en XP par jour. */
function tierBase(tier: number): number {
  return 60 + tier * 40;
}

function draw(rng: () => number, names: string[]): string {
  const idx = Math.floor(rng() * names.length);
  const [first] = names.splice(idx, 1);
  const initial = String.fromCharCode(65 + Math.floor(rng() * 26));
  return `${first} ${initial}.`;
}

/**
 * Les 29 adversaires : 3 rivaux, tirés une fois pour toutes et qu'on
 * retrouve de semaine en semaine (au rythme de la division du moment), et
 * 26 joueurs de passage tirés depuis la graine de la semaine.
 */
function opponents(seed: number, tier: number, rivalSeed: number): Opponent[] {
  const base = tierBase(tier);
  const names = [...FIRST_NAMES];
  const out: Opponent[] = [];

  const rivalRng = mulberry32(rivalSeed || 1);
  for (let i = 0; i < RIVALS; i += 1) {
    // Des rivaux toujours dans la course : entre 0,8 et 1,4 fois le rythme moyen.
    out.push({ name: draw(rivalRng, names), rate: base * (0.8 + 0.6 * rivalRng()), jitter: rivalRng(), rival: true });
  }

  const rng = mulberry32(seed);
  while (out.length < LEAGUE_SIZE - 1) {
    out.push({ name: draw(rng, names), rate: base * (0.3 + 1.7 * rng()), jitter: rng(), rival: false });
  }
  return out;
}

/** Rythme d'un adversaire un jour donné : entre 0,5 et 1,5 fois son rythme moyen. */
function dayFactor(o: Opponent, day: number): number {
  return 1 + 0.5 * Math.sin(o.jitter * 31 + day * 2.4);
}

/**
 * XP d'un adversaire après `days` jours (1..7), le dernier jour compté à
 * hauteur de `fraction` (0..1, la part de la journée écoulée). Cumul de
 * journées : croissant par construction, jour après jour et heure après heure.
 */
function opponentXp(o: Opponent, days: number, fraction: number): number {
  const d = Math.max(1, Math.min(LEAGUE_DAYS, days));
  const f = Math.max(0, Math.min(1, fraction));
  let xp = 0;
  for (let day = 1; day < d; day += 1) xp += o.rate * dayFactor(o, day);
  xp += o.rate * dayFactor(o, d) * f;
  return Math.floor(xp);
}

function elapsedDays(state: LeagueState, today: DayKey): number {
  if (state.weekKey === null) return 1;
  return Math.max(1, Math.min(LEAGUE_DAYS, daysBetween(state.weekKey, today) + 1));
}

/**
 * Le classement complet, meilleur XP en tête ; l'utilisateur est marqué.
 * `dayFraction` : part de la journée écoulée (0..1), pour que les adversaires
 * avancent au fil des heures et pas d'un bloc à minuit. 1 = journée entière.
 */
export function leagueStandings(state: LeagueState, today: DayKey, dayFraction = 1): Competitor[] {
  const days = elapsedDays(state, today);
  const list: Competitor[] = opponents(state.seed, state.tier, state.rivalSeed).map((o) => ({
    name: o.name,
    xp: opponentXp(o, days, dayFraction),
    isUser: false,
    rival: o.rival,
  }));
  list.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  // À XP égal, l'utilisateur passe devant : on ne le relègue pas sur une égalité.
  let at = list.findIndex((c) => c.xp <= state.xpThisWeek);
  if (at === -1) at = list.length;
  list.splice(at, 0, { name: 'Toi', xp: state.xpThisWeek, isUser: true, rival: false });
  return list;
}

/** Part de la journée écoulée à l'instant `now`, 0..1. */
export function dayFractionOf(now: Date): number {
  return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
}

export function userRank(state: LeagueState, today: DayKey, dayFraction = 1): number {
  return leagueStandings(state, today, dayFraction).findIndex((c) => c.isUser) + 1;
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

  const rivalSeed = state.rivalSeed || hashString(`rivals:${week}`);

  if (state.weekKey === null) {
    return { ...state, weekKey: week, seed: hashString(`league:${week}:${state.tier}`), xpThisWeek: 0, rivalSeed };
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
    rivalSeed,
  };
}

export function addLeagueXp(state: LeagueState, amount: number): LeagueState {
  return { ...state, xpThisWeek: state.xpThisWeek + Math.max(0, amount) };
}

export function clearLeagueOutcome(state: LeagueState): LeagueState {
  return { ...state, pendingOutcome: null };
}
