/**
 * Quatre techniques de la science de l'apprentissage, en règles pures.
 *
 * 1. PRÉTEST (« pretesting effect », Richland, Kornell & Kao 2009 ; Kornell,
 *    Hays & Bjork 2009) : tenter de répondre AVANT d'avoir appris, même en se
 *    trompant, améliore la mémorisation de la bonne réponse vue ensuite. Une
 *    leçon jamais commencée s'ouvre sur PRETEST_SIZE questions de la leçon,
 *    sans aucune conséquence (ni énergie, ni progression, ni file d'erreurs).
 *
 * 2. CONFIANCE (« hypercorrection effect », Butterfield & Metcalfe 2001) :
 *    une erreur commise avec assurance, une fois corrigée, est mieux retenue
 *    que les autres, à condition de la revoir. L'apprenant dit « sûr » avant
 *    de valider ; une erreur « sûre » est signalée et passe en tête de la
 *    file « à revoir » (voir applyAnswer et compareReview dans review.ts).
 *
 * 3. ENTRELACEMENT (« interleaving », Rohrer & Taylor 2007 ; Kornell & Bjork
 *    2008) : alterner les matières dans une révision oblige à reconnaître de
 *    quel problème il s'agit, au lieu d'enchaîner par automatisme.
 *
 * 4. RÉAPPRENTISSAGE JUSQU'AU CRITÈRE (« successive relearning », Rawson &
 *    Dunlosky 2011, 2013) : ce qu'on rate revient dans la MÊME séance jusqu'à
 *    une bonne réponse (au plus RELEARN_MAX retours), puis les jours suivants
 *    par la file et le deck.
 */

import type { Exercise, Progress } from './types';

export const PRETEST_SIZE = 2;
export const RELEARN_MAX = 2;

/** L'apprenant a-t-il déjà répondu à au moins un exercice de l'unité ? */
export function unitStarted(progress: Progress, unitId: string): boolean {
  const prefix = `${unitId}:`;
  return Object.values(progress.questions).some((q) => q.key.startsWith(prefix) && q.seen > 0);
}

/**
 * Les questions du prétest : les premiers QCM d'au moins trois choix de la
 * leçon (on les retrouvera donc pendant la leçon), sans doublon. Vide pour
 * une unité déjà commencée.
 */
export function pickPretest(session: readonly Exercise[], started: boolean, size: number = PRETEST_SIZE): Exercise[] {
  if (started) return [];
  const out: Exercise[] = [];
  for (const e of session) {
    if (out.length >= size) break;
    if (e.kind === 'qcm' && e.choices.length >= 3 && !out.some((o) => o.key === e.key)) out.push(e);
  }
  return out;
}

/**
 * Entrelace des éléments par groupe (matière) : un de chaque groupe à tour de
 * rôle, groupes dans l'ordre de leur première apparition, ordre conservé dans
 * chaque groupe. Deux éléments du même groupe ne se suivent que lorsqu'il ne
 * reste plus qu'un groupe.
 */
export function interleaveBy<T>(items: readonly T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const g = groupOf(item);
    const list = groups.get(g);
    if (list) list.push(item);
    else groups.set(g, [item]);
  }
  const lists = [...groups.values()];
  const out: T[] = [];
  for (let round = 0; out.length < items.length; round += 1) {
    for (const list of lists) if (round < list.length) out.push(list[round]);
  }
  return out;
}

/** Un élément raté `failsThisSession` fois dans la séance doit-il revenir avant la fin ? */
export function shouldRelearn(failsThisSession: number): boolean {
  return failsThisSession >= 1 && failsThisSession <= RELEARN_MAX;
}
