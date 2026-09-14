import type { Subject } from './types';

/** Titres et accroches : traduits à la volée (voir index.ts) ; ici la version française. */
export const SUBJECTS: readonly Subject[] = [
  { id: 'marketing', title: 'Marketing digital', tagline: 'SEO, GEO, publicité, analytics, growth', emoji: '📈', color: '#E8562B' },
  { id: 'ia', title: 'Intelligence artificielle', tagline: 'LLM, prompting, entraînement, culture IA', emoji: '🧠', color: '#7C3AED' },
  { id: 'python', title: 'Python', tagline: 'Terminal, bases, texte, pandas, requêtes', emoji: '🐍', color: '#2563EB' },
  { id: 'web', title: 'HTML, CSS & JavaScript', tagline: 'Le web côté navigateur', emoji: '🌐', color: '#16A34A' },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));
