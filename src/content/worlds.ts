/**
 * Les mondes : chaque matière est découpée en sections thématiques, comme
 * les « sections » de Duolingo. Un monde a son nom, sa couleur, son emblème ;
 * le parcours change de visage à chaque monde. Les unités gardent leur ordre
 * (units.ts) : un monde n'est qu'un regroupement d'unités consécutives.
 */

import type { SubjectId } from '@/game';

import { EXTRA_UNIT_WORLDS } from './extra';

export type WorldText = string;

export interface World {
  id: string;
  subjectId: SubjectId;
  /** Numéro dans la matière, à partir de 1. */
  index: number;
  emoji: string;
  color: string;
  title: WorldText;
  subtitle: WorldText;
  unitIds: readonly string[];
}

const w = (
  subjectId: SubjectId,
  index: number,
  emoji: string,
  color: string,
  title: WorldText,
  subtitle: WorldText,
  unitIds: string[],
): World => ({ id: `${subjectId}-w${index}`, subjectId, index, emoji, color, title, subtitle, unitIds });

const BASE_WORLDS: World[] = [
  // ------------------------------------------------------------- Marketing
  w('marketing', 1, '🌱', '#E8562B', 'First steps', 'Vocabulary and the funnel', ['mkt-bases-1', 'mkt-bases-2']),
  w('marketing', 2, '🔍', '#D9480F', 'SEO', 'Getting found on Google', ['mkt-seo-1', 'mkt-seo-2', 'mkt-seo-3', 'mkt-seo-4', 'mkt-seo-5', 'mkt-seo-6']),
  w('marketing', 3, '🤖', '#B5179E', 'GEO', 'Getting cited by AI', ['mkt-geo-1', 'mkt-case-2']),
  w('marketing', 4, '📣', '#B45309', 'Advertising', 'Buying traffic without wasting it', ['mkt-paid-1', 'mkt-paid-2', 'mkt-paid-3', 'mkt-paid-4']),
  w('marketing', 5, '📊', '#0891B2', 'Analytics', 'Measuring and attributing', ['mkt-analytics-1', 'mkt-analytics-2', 'mkt-analytics-3', 'mkt-analytics-4', 'mkt-case-3']),
  w('marketing', 6, '✍️', '#16A34A', 'Conversion and content', 'Pages, emails, social', ['mkt-cro-1', 'mkt-cro-2', 'mkt-content-1', 'mkt-email-1', 'mkt-social-1']),
  w('marketing', 7, '🚀', '#7C3AED', 'Growth and strategy', 'From product to market', ['mkt-growth-1', 'mkt-growth-2', 'mkt-growth-3', 'mkt-strategy-1', 'mkt-strategy-2', 'mkt-strategy-3', 'mkt-case-1']),
  w('marketing', 8, '💌', '#DB2777', 'Customer relationship', 'CRM, automation, e-commerce', []),
  w('marketing', 9, '🎬', '#9333EA', 'Brand and influence', 'Branding, video, creators', []),

  // -------------------------------------------------------------------- IA
  w('ia', 1, '🧠', '#7C3AED', 'Discovering AI', 'The words, the history, the players', ['ia-1', 'ia-hist-1', 'ia-2', 'ia-9']),
  w('ia', 2, '⚙️', '#2563EB', 'Inside the machine', 'How an LLM reads and answers', ['ia-4', 'ia-llm-2', 'ia-3', 'ia-prompt-2']),
  w('ia', 3, '🏗️', '#0F766E', 'Building', 'RAG, data, training, agents', ['ia-5', 'ia-data-1', 'ia-6', 'ia-train-2', 'ia-agents-1', 'ia-8']),
  w('ia', 4, '⚖️', '#DC2626', 'Responsibility', 'Safety, law, marketing uses', ['ia-7', 'ia-reg-1', 'ia-mkt-1', 'ia-case-1']),
  w('ia', 5, '🧰', '#0891B2', 'Everyday AI', 'Tools, images, automations', []),

  // ---------------------------------------------------------------- Python
  w('python', 1, '🐣', '#2563EB', 'Getting started', 'Terminal, variables, loops', ['py-1', 'py-2', 'py-concepts-1', 'py-3']),
  w('python', 2, '🧱', '#0891B2', 'Structures', 'Lists, dictionaries, text', ['py-4', 'py-concepts-2', 'py-5', 'py-6']),
  w('python', 3, '🛠️', '#A16207', 'Good code', 'Errors, operators, practices', ['py-7', 'py-8', 'py-pratiques-1', 'py-outils-1']),
  w('python', 4, '📈', '#16A34A', 'Data', 'Pandas from A to Z', ['py-9', 'py-10', 'py-11', 'py-data-1']),
  w('python', 5, '🌐', '#7C3AED', 'Python and the web', 'Requests, files, APIs, automation', ['py-12', 'py-13', 'py-web-1', 'py-case-1']),

  // ------------------------------------------------------------------ HTML
  w('html', 1, '🧩', '#C2410C', 'The basics', 'The web and the structure of a page', ['web-1', 'web-2']),
  w('html', 2, '🔎', '#DB2777', 'Pro HTML', 'Semantics, SEO, tracking', ['web-html-2', 'web-mkt-1']),

  // ------------------------------------------------------------------- CSS
  w('css', 1, '🎨', '#0369A1', 'The basics', 'Selectors, box model, flexbox', ['web-3']),
  w('css', 2, '📐', '#7C3AED', 'Layout and style', 'Responsive, colors, animations', ['web-css-2', 'web-css-3']),
  w('css', 3, '🧪', '#16A34A', 'Pro CSS', 'Typography, transforms, organization', []),

  // ------------------------------------------------------------ JavaScript
  w('js', 1, '⚡', '#B45309', 'The basics', 'Variables, DOM, fetch', ['web-4', 'web-js-2']),
  w('js', 2, '🛠️', '#0F766E', 'Tools', 'Git, frameworks, SDKs', ['web-5']),
  w('js', 3, '🚀', '#16A34A', 'In production', 'Performance, architecture, case studies', ['web-6', 'web-7', 'web-case-1']),
];

// Les unités rédigées en JSON rejoignent le monde qu'elles déclarent, à la suite.
for (const extra of EXTRA_UNIT_WORLDS) {
  const world = BASE_WORLDS.find((wd) => wd.id === extra.world);
  if (world && !world.unitIds.includes(extra.id)) (world.unitIds as string[]).push(extra.id);
}

export const WORLDS: readonly World[] = BASE_WORLDS;

export const WORLD_BY_UNIT: ReadonlyMap<string, World> = new Map(WORLDS.flatMap((wd) => wd.unitIds.map((u) => [u, wd] as const)));

export function worldsOf(subjectId: string): World[] {
  return WORLDS.filter((wd) => wd.subjectId === subjectId);
}

/** Un monde est terminé quand toutes ses unités ont au moins `threshold` couronnes (jamais s'il est vide). */
export function isWorldComplete(world: World, traits: Record<string, number>, threshold: number): boolean {
  return world.unitIds.length > 0 && world.unitIds.every((id) => (traits[id] ?? 0) >= threshold);
}

export function worldProgress(world: World, traits: Record<string, number>, threshold: number): number {
  return world.unitIds.filter((id) => (traits[id] ?? 0) >= threshold).length;
}
