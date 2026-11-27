/**
 * Les duels : deux notions que l'apprenant confond, côte à côte. Une
 * définition, deux termes, un choix ; puis les deux définitions l'une sous
 * l'autre.
 *
 * Les paires viennent d'abord des VRAIES confusions de l'apprenant (il a
 * choisi le terme B à la place du terme A dans une leçon), puis des paires
 * connues (src/data/confusables.json) voisines des notions ratées. Une paire
 * sort des duels après MASTERED_WINS victoires d'affilée, un jour différent
 * chaque fois : réussir trois fois de suite le même soir ne prouve rien.
 */

import type { ConfusionState, DayKey, Progress } from './types';

export const MASTERED_WINS = 3;

/** Clé d'une paire, indépendante de l'ordre. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function blank(a: string, b: string): ConfusionState {
  const [x, y] = a < b ? [a, b] : [b, a];
  return { a: x, b: y, misses: 0, wins: 0, lastWinDay: null };
}

/** L'apprenant a pris `chosen` pour `expected` : la paire entre (ou remonte) dans les duels. */
export function recordConfusion(progress: Progress, expected: string, chosen: string): Progress {
  if (expected === chosen) return progress;
  const key = pairKey(expected, chosen);
  const prev = progress.confusions[key] ?? blank(expected, chosen);
  return { ...progress, confusions: { ...progress.confusions, [key]: { ...prev, misses: prev.misses + 1, wins: 0 } } };
}

export function isMastered(c: ConfusionState): boolean {
  return c.wins >= MASTERED_WINS;
}

/** Résultat d'un duel. Une victoire compte une fois par jour ; une défaite remet la série à zéro. */
export function applyDuel(progress: Progress, a: string, b: string, correct: boolean, today: DayKey): Progress {
  const key = pairKey(a, b);
  const prev = progress.confusions[key] ?? blank(a, b);
  const next: ConfusionState = correct
    ? prev.lastWinDay === today
      ? prev
      : { ...prev, wins: prev.wins + 1, lastWinDay: today }
    : { ...prev, misses: prev.misses + 1, wins: 0, lastWinDay: null };
  return { ...progress, confusions: { ...progress.confusions, [key]: next } };
}

/**
 * Les paires à jouer : les confusions personnelles non maîtrisées (les plus
 * ratées d'abord), puis les paires candidates (connues, voisines des
 * notions ratées) jamais jouées. Une paire déjà gagnée aujourd'hui attend
 * demain. `limit` paires au plus.
 */
export function pickDuelPairs(
  confusions: Readonly<Record<string, ConfusionState>>,
  candidates: readonly (readonly [string, string])[],
  today: DayKey,
  limit: number,
): [string, string][] {
  if (limit <= 0) return [];
  const personal = Object.values(confusions)
    .filter((c) => !isMastered(c) && c.lastWinDay !== today)
    .sort((x, y) => y.misses - x.misses || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)));
  const out: [string, string][] = personal.map((c) => [c.a, c.b]);
  const seen = new Set(out.map(([a, b]) => pairKey(a, b)));
  for (const [a, b] of candidates) {
    if (a === b) continue;
    const key = pairKey(a, b);
    if (seen.has(key) || confusions[key] !== undefined) continue;
    seen.add(key);
    out.push(a < b ? [a, b] : [b, a]);
  }
  return out.slice(0, limit);
}
