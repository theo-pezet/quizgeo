/**
 * Les mondes : chaque matière est découpée en sections thématiques, comme
 * les « sections » de Duolingo. Un monde a son nom, sa couleur, son emblème ;
 * le parcours change de visage à chaque monde. Les unités gardent leur ordre
 * (units.ts) : un monde n'est qu'un regroupement d'unités consécutives.
 */

import type { SubjectId } from '@/game';

export type WorldText = { fr: string; en: string; es: string };

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

export const WORLDS: readonly World[] = [
  // ------------------------------------------------------------- Marketing
  w('marketing', 1, '🌱', '#E8562B', { fr: 'Premiers pas', en: 'First steps', es: 'Primeros pasos' }, { fr: 'Le vocabulaire et le funnel', en: 'Vocabulary and the funnel', es: 'El vocabulario y el funnel' }, ['mkt-bases-1', 'mkt-bases-2']),
  w('marketing', 2, '🔍', '#D9480F', { fr: 'SEO', en: 'SEO', es: 'SEO' }, { fr: 'Être trouvé sur Google', en: 'Getting found on Google', es: 'Que te encuentren en Google' }, ['mkt-seo-1', 'mkt-seo-2', 'mkt-seo-3', 'mkt-seo-4', 'mkt-seo-5', 'mkt-seo-6']),
  w('marketing', 3, '🤖', '#B5179E', { fr: 'GEO', en: 'GEO', es: 'GEO' }, { fr: 'Être cité par les IA', en: 'Getting cited by AI', es: 'Que las IA te citen' }, ['mkt-geo-1', 'mkt-case-2']),
  w('marketing', 4, '📣', '#F59E0B', { fr: 'Publicité', en: 'Advertising', es: 'Publicidad' }, { fr: 'Acheter du trafic sans le gaspiller', en: 'Buying traffic without wasting it', es: 'Comprar tráfico sin malgastarlo' }, ['mkt-paid-1', 'mkt-paid-2', 'mkt-paid-3', 'mkt-paid-4']),
  w('marketing', 5, '📊', '#0891B2', { fr: 'Analytics', en: 'Analytics', es: 'Analítica' }, { fr: 'Mesurer et attribuer', en: 'Measuring and attributing', es: 'Medir y atribuir' }, ['mkt-analytics-1', 'mkt-analytics-2', 'mkt-analytics-3', 'mkt-analytics-4', 'mkt-case-3']),
  w('marketing', 6, '✍️', '#16A34A', { fr: 'Conversion et contenu', en: 'Conversion and content', es: 'Conversión y contenido' }, { fr: 'Pages, emails, réseaux', en: 'Pages, emails, social', es: 'Páginas, emails, redes' }, ['mkt-cro-1', 'mkt-cro-2', 'mkt-content-1', 'mkt-email-1', 'mkt-social-1']),
  w('marketing', 7, '🚀', '#7C3AED', { fr: 'Growth et stratégie', en: 'Growth and strategy', es: 'Growth y estrategia' }, { fr: 'Du produit au marché', en: 'From product to market', es: 'Del producto al mercado' }, ['mkt-growth-1', 'mkt-growth-2', 'mkt-growth-3', 'mkt-strategy-1', 'mkt-strategy-2', 'mkt-strategy-3', 'mkt-case-1']),

  // -------------------------------------------------------------------- IA
  w('ia', 1, '🧠', '#7C3AED', { fr: 'Découvrir l’IA', en: 'Discovering AI', es: 'Descubrir la IA' }, { fr: 'Les mots, l’histoire, les acteurs', en: 'The words, the history, the players', es: 'Las palabras, la historia, los actores' }, ['ia-1', 'ia-hist-1', 'ia-2', 'ia-9']),
  w('ia', 2, '⚙️', '#2563EB', { fr: 'Dans la machine', en: 'Inside the machine', es: 'Dentro de la máquina' }, { fr: 'Comment un LLM lit et répond', en: 'How an LLM reads and answers', es: 'Cómo lee y responde un LLM' }, ['ia-4', 'ia-llm-2', 'ia-3', 'ia-prompt-2']),
  w('ia', 3, '🏗️', '#0F766E', { fr: 'Construire', en: 'Building', es: 'Construir' }, { fr: 'RAG, données, entraînement, agents', en: 'RAG, data, training, agents', es: 'RAG, datos, entrenamiento, agentes' }, ['ia-5', 'ia-data-1', 'ia-6', 'ia-train-2', 'ia-agents-1', 'ia-8']),
  w('ia', 4, '⚖️', '#DC2626', { fr: 'Responsabilité', en: 'Responsibility', es: 'Responsabilidad' }, { fr: 'Sécurité, loi, usages marketing', en: 'Safety, law, marketing uses', es: 'Seguridad, ley, usos en marketing' }, ['ia-7', 'ia-reg-1', 'ia-mkt-1', 'ia-case-1']),

  // ---------------------------------------------------------------- Python
  w('python', 1, '🐣', '#2563EB', { fr: 'Démarrer', en: 'Getting started', es: 'Empezar' }, { fr: 'Terminal, variables, boucles', en: 'Terminal, variables, loops', es: 'Terminal, variables, bucles' }, ['py-1', 'py-2', 'py-concepts-1', 'py-3']),
  w('python', 2, '🧱', '#0891B2', { fr: 'Structures', en: 'Structures', es: 'Estructuras' }, { fr: 'Listes, dictionnaires, texte', en: 'Lists, dictionaries, text', es: 'Listas, diccionarios, texto' }, ['py-4', 'py-concepts-2', 'py-5', 'py-6']),
  w('python', 3, '🛠️', '#CA8A04', { fr: 'Du bon code', en: 'Good code', es: 'Buen código' }, { fr: 'Erreurs, opérateurs, pratiques', en: 'Errors, operators, practices', es: 'Errores, operadores, prácticas' }, ['py-7', 'py-8', 'py-pratiques-1', 'py-outils-1']),
  w('python', 4, '📈', '#16A34A', { fr: 'Données', en: 'Data', es: 'Datos' }, { fr: 'Pandas de A à Z', en: 'Pandas from A to Z', es: 'Pandas de la A a la Z' }, ['py-9', 'py-10', 'py-11', 'py-data-1']),
  w('python', 5, '🌐', '#7C3AED', { fr: 'Python et le web', en: 'Python and the web', es: 'Python y la web' }, { fr: 'Requêtes, fichiers, API, automatisation', en: 'Requests, files, APIs, automation', es: 'Peticiones, archivos, API, automatización' }, ['py-12', 'py-13', 'py-web-1', 'py-case-1']),

  // ------------------------------------------------------------------ HTML
  w('html', 1, '🧩', '#F97316', { fr: 'Les bases', en: 'The basics', es: 'Las bases' }, { fr: 'Le web et la structure d’une page', en: 'The web and the structure of a page', es: 'La web y la estructura de una página' }, ['web-1', 'web-2']),
  w('html', 2, '🔎', '#DB2777', { fr: 'HTML pro', en: 'Pro HTML', es: 'HTML pro' }, { fr: 'Sémantique, SEO, tracking', en: 'Semantics, SEO, tracking', es: 'Semántica, SEO, tracking' }, ['web-html-2', 'web-mkt-1']),

  // ------------------------------------------------------------------- CSS
  w('css', 1, '🎨', '#0EA5E9', { fr: 'Les bases', en: 'The basics', es: 'Las bases' }, { fr: 'Sélecteurs, box model, flexbox', en: 'Selectors, box model, flexbox', es: 'Selectores, box model, flexbox' }, ['web-3']),
  w('css', 2, '📐', '#7C3AED', { fr: 'Mise en page et style', en: 'Layout and style', es: 'Maquetación y estilo' }, { fr: 'Responsive, couleurs, animations', en: 'Responsive, colours, animations', es: 'Responsive, colores, animaciones' }, ['web-css-2', 'web-css-3']),

  // ------------------------------------------------------------ JavaScript
  w('js', 1, '⚡', '#D97706', { fr: 'Les bases', en: 'The basics', es: 'Las bases' }, { fr: 'Variables, DOM, fetch', en: 'Variables, DOM, fetch', es: 'Variables, DOM, fetch' }, ['web-4', 'web-js-2']),
  w('js', 2, '🛠️', '#0F766E', { fr: 'Outils', en: 'Tools', es: 'Herramientas' }, { fr: 'Git, frameworks, SDK', en: 'Git, frameworks, SDKs', es: 'Git, frameworks, SDK' }, ['web-5']),
  w('js', 3, '🚀', '#16A34A', { fr: 'En production', en: 'In production', es: 'En producción' }, { fr: 'Performance, architecture, cas pratiques', en: 'Performance, architecture, case studies', es: 'Rendimiento, arquitectura, casos prácticos' }, ['web-6', 'web-7', 'web-case-1']),
];

export const WORLD_BY_UNIT: ReadonlyMap<string, World> = new Map(WORLDS.flatMap((wd) => wd.unitIds.map((u) => [u, wd] as const)));

export function worldsOf(subjectId: string): World[] {
  return WORLDS.filter((wd) => wd.subjectId === subjectId);
}

/** Un monde est terminé quand toutes ses unités ont au moins `threshold` couronnes. */
export function isWorldComplete(world: World, traits: Record<string, number>, threshold: number): boolean {
  return world.unitIds.every((id) => (traits[id] ?? 0) >= threshold);
}

export function worldProgress(world: World, traits: Record<string, number>, threshold: number): number {
  return world.unitIds.filter((id) => (traits[id] ?? 0) >= threshold).length;
}
