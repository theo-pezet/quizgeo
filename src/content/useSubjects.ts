import { useSettings } from '@/store/progress';

import type { Subject } from './types';
import { useContent } from './useContent';

/** Les matières que l'utilisateur a choisies (toutes, s'il n'a rien choisi). */
export function useActiveSubjects(): Subject[] {
  const { SUBJECTS } = useContent();
  const chosen = useSettings((s) => s.subjects);
  if (!chosen || chosen.length === 0) return [...SUBJECTS];
  const active = SUBJECTS.filter((s) => chosen.includes(s.id));
  return active.length > 0 ? active : [...SUBJECTS];
}
