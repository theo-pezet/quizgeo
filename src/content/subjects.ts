import type { Subject } from './types';

/**
 * Titres et accroches : traduits à la volée (voir index.ts) ; ici la version française.
 * Les couleurs portent du texte blanc (pastilles, boutons) : contraste d'au moins 3,5:1.
 */
export const SUBJECTS: readonly Subject[] = [
  { id: 'marketing', title: 'Marketing digital', tagline: 'SEO, GEO, publicité, analytics, growth', emoji: '📈', color: '#E8562B' },
  { id: 'ia', title: 'Intelligence artificielle', tagline: 'LLM, prompting, entraînement, culture IA', emoji: '🧠', color: '#7C3AED' },
  { id: 'python', title: 'Python', tagline: 'Terminal, bases, texte, pandas, requêtes', emoji: '🐍', color: '#2563EB' },
  { id: 'html', title: 'HTML', tagline: 'La structure des pages web', emoji: '🧩', color: '#C2410C' },
  { id: 'css', title: 'CSS', tagline: 'Le style et la mise en page', emoji: '🎨', color: '#0369A1' },
  { id: 'js', title: 'JavaScript', tagline: 'L’interactivité côté navigateur', emoji: '⚡', color: '#B45309' },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));
