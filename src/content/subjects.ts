import type { Subject } from './types';

/** Titres et accroches : traduits à la volée (voir index.ts) ; ici la version française. */
export const SUBJECTS: readonly Subject[] = [
  { id: 'marketing', title: 'Marketing digital', tagline: 'SEO, GEO, publicité, analytics, growth', emoji: '📈', color: '#E8562B' },
  { id: 'ia', title: 'Intelligence artificielle', tagline: 'LLM, prompting, entraînement, culture IA', emoji: '🧠', color: '#7C3AED' },
  { id: 'python', title: 'Python', tagline: 'Terminal, bases, texte, pandas, requêtes', emoji: '🐍', color: '#2563EB' },
  { id: 'html', title: 'HTML', tagline: 'La structure des pages web', emoji: '🧩', color: '#F97316' },
  { id: 'css', title: 'CSS', tagline: 'Le style et la mise en page', emoji: '🎨', color: '#0EA5E9' },
  { id: 'js', title: 'JavaScript', tagline: 'L’interactivité côté navigateur', emoji: '⚡', color: '#D97706' },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));
