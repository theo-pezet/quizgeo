/**
 * XP et niveaux
 *
 * Règle absolue : les XP ne baissent jamais. Toute sortie négative est un bug,
 * et `addXp` refuse de produire une valeur négative même si on lui passe un
 * delta négatif.
 */

import type { SessionMode } from './types';

export const XP_CORRECT_UNIT = 10;
export const XP_CORRECT_REVIEW = 5;
export const XP_SESSION_COMPLETE = 20;
export const XP_PERFECT_BONUS = 30;

/** En dessous, une session ne compte ni pour le bonus ni pour la série. */
export const MIN_SESSION_LENGTH = 5;

/** Longueur d'une session pleine. Le « sans faute » se juge sur 10/10. */
export const FULL_SESSION_LENGTH = 10;

export const LEVEL_STEP = 100;

/** XP d'une réponse isolée. Une mauvaise réponse rapporte 0, jamais moins. */
export function xpForAnswer(params: {
  mode: SessionMode;
  correct: boolean;
  chrono: boolean;
}): number {
  if (!params.correct) return 0;
  const base = params.mode === 'unit' ? XP_CORRECT_UNIT : XP_CORRECT_REVIEW;
  return params.chrono ? base * 2 : base;
}

export interface SessionXpBreakdown {
  answers: number;
  completion: number;
  perfect: number;
  total: number;
}

/**
 * XP d'une session complète.
 *
 * Le doublement chrono porte sur les réponses SEULEMENT, jamais sur les bonus
 * de session.
 *
 * Décision d'interprétation, à valider : « Session sans faute (10/10) » est
 * lu strictement — il faut 10 questions ET 10 bonnes réponses. Une session de
 * révision de 7 questions réussie de bout en bout ne déclenche donc pas le
 * bonus, ni le badge « Sans faute ».
 */
export function xpForSession(params: {
  mode: SessionMode;
  questionCount: number;
  correctCount: number;
  chrono: boolean;
}): SessionXpBreakdown {
  const { mode, questionCount, correctCount, chrono } = params;
  const base = mode === 'unit' ? XP_CORRECT_UNIT : XP_CORRECT_REVIEW;
  const answers = correctCount * base * (chrono ? 2 : 1);
  const completion = questionCount >= MIN_SESSION_LENGTH ? XP_SESSION_COMPLETE : 0;
  const perfect = isPerfectSession(questionCount, correctCount) ? XP_PERFECT_BONUS : 0;
  return { answers, completion, perfect, total: answers + completion + perfect };
}

export function isPerfectSession(questionCount: number, correctCount: number): boolean {
  return questionCount === FULL_SESSION_LENGTH && correctCount === FULL_SESSION_LENGTH;
}

/** XP cumulés nécessaires pour atteindre le niveau n : 100 × n × (n − 1) / 2. */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return (LEVEL_STEP * level * (level - 1)) / 2;
}

/** Niveau atteint avec `xp` XP. Sans plafond. */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP acquis à l'intérieur du niveau courant. */
  intoLevel: number;
  /** XP nécessaires pour franchir le niveau courant. */
  levelSpan: number;
  /** 0..1, pour la barre du Profil. */
  ratio: number;
  xpToNextLevel: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, xp);
  const level = levelForXp(safeXp);
  const floor = xpThresholdForLevel(level);
  const ceiling = xpThresholdForLevel(level + 1);
  // L'écart entre deux seuils vaut 100 × niveau : jamais nul, jamais négatif.
  const levelSpan = ceiling - floor;
  const intoLevel = safeXp - floor;
  return {
    level,
    intoLevel,
    levelSpan,
    ratio: intoLevel / levelSpan,
    xpToNextLevel: ceiling - safeXp,
  };
}

/** Ajoute des XP. Ne descend jamais sous 0 et ignore les deltas négatifs. */
export function addXp(current: number, delta: number): number {
  const safeCurrent = Math.max(0, current);
  const safeDelta = Math.max(0, delta);
  return safeCurrent + safeDelta;
}

/** Franchissement de niveau, pour la ligne « Niveau 4 → 5 » de fin de session. */
export function levelUp(
  xpBefore: number,
  xpAfter: number,
): { crossed: boolean; from: number; to: number } {
  const from = levelForXp(xpBefore);
  const to = levelForXp(xpAfter);
  return { crossed: to > from, from, to };
}
