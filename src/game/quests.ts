/**
 * Les quêtes du jour : trois objectifs tirés au sort chaque jour, une
 * récompense en gemmes pour chacun. La graine est le jour : tout le monde a
 * les mêmes quêtes le même jour, et une réinstallation ne les change pas.
 */

import { mulberry32, hashString } from './random';
import type { DayKey, Quest, QuestKind, QuestState } from './types';

interface QuestTemplate {
  kind: QuestKind;
  /** Paliers possibles : [cible, récompense]. */
  tiers: [number, number][];
}

export const QUEST_TEMPLATES: readonly QuestTemplate[] = [
  { kind: 'xp', tiers: [[50, 20], [100, 30], [150, 40]] },
  { kind: 'lessons', tiers: [[2, 20], [3, 30]] },
  { kind: 'perfect', tiers: [[1, 40]] },
  { kind: 'combo', tiers: [[5, 20], [8, 35]] },
  { kind: 'cards', tiers: [[10, 20], [20, 30]] },
  { kind: 'recover', tiers: [[3, 25], [5, 35]] },
];

export const QUESTS_PER_DAY = 3;

export function questLabel(quest: Quest): string {
  switch (quest.kind) {
    case 'xp':
      return `Gagner ${quest.target} XP`;
    case 'lessons':
      return `Terminer ${quest.target} leçons`;
    case 'perfect':
      return 'Faire une leçon sans faute';
    case 'combo':
      return `Enchaîner ${quest.target} bonnes réponses`;
    case 'cards':
      return `Réviser ${quest.target} cartes du deck`;
    case 'recover':
      return `Sortir ${quest.target} exercices de la file « à revoir »`;
  }
}

/** Les quêtes d'un jour donné : 3 genres distincts, un palier chacun. */
export function questsForDay(day: DayKey): Quest[] {
  const rng = mulberry32(hashString(`quests:${day}`));
  const pool = [...QUEST_TEMPLATES];
  const out: Quest[] = [];
  while (out.length < QUESTS_PER_DAY && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    const [template] = pool.splice(i, 1);
    const [target, reward] = template.tiers[Math.floor(rng() * template.tiers.length)];
    out.push({ id: `${day}:${template.kind}`, kind: template.kind, target, progress: 0, reward, done: false });
  }
  return out;
}

/**
 * Régénère les quêtes si le jour a changé. Idempotent le même jour. Un jour
 * ANTÉRIEUR (fuseau, horloge reculée) ne change rien : sinon les quêtes
 * seraient rejouées, et payées une seconde fois.
 */
export function ensureQuests(state: QuestState, today: DayKey): QuestState {
  if (state.day === today) return state;
  if (state.day !== null && today < state.day) return state;
  return { day: today, items: questsForDay(today) };
}

export type QuestEvent =
  | { kind: 'xp'; amount: number }
  | { kind: 'lesson'; perfect: boolean }
  | { kind: 'combo'; best: number }
  | { kind: 'cards'; count: number }
  | { kind: 'recover'; count: number };

/**
 * Fait avancer les quêtes concernées par un événement. Une quête accomplie
 * est marquée `done` ; l'appelant verse la récompense (compteur, gemmes).
 */
export function applyQuestEvent(
  state: QuestState,
  event: QuestEvent,
): { state: QuestState; completed: Quest[] } {
  const completed: Quest[] = [];
  const items = state.items.map((quest) => {
    if (quest.done) return quest;
    let progress = quest.progress;
    switch (event.kind) {
      case 'xp':
        if (quest.kind === 'xp') progress += event.amount;
        break;
      case 'lesson':
        if (quest.kind === 'lessons') progress += 1;
        if (quest.kind === 'perfect' && event.perfect) progress += 1;
        break;
      case 'combo':
        if (quest.kind === 'combo') progress = Math.max(progress, event.best);
        break;
      case 'cards':
        if (quest.kind === 'cards') progress += event.count;
        break;
      case 'recover':
        if (quest.kind === 'recover') progress += event.count;
        break;
    }
    if (progress === quest.progress) return quest;
    const done = progress >= quest.target;
    const next = { ...quest, progress: Math.min(progress, quest.target), done };
    if (done) completed.push(next);
    return next;
  });
  return { state: { ...state, items }, completed };
}

export function questsReward(completed: readonly Quest[]): number {
  return completed.reduce((sum, q) => sum + q.reward, 0);
}
