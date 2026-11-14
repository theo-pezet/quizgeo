/**
 * Exercices écrits à la main (src/data/exercises.manual.json, en anglais).
 * Ils complètent (ou constituent) les unités qui ne peuvent pas se contenter
 * du deck : GEO, culture IA, HTML / CSS / JS, lecture de code Python, cas
 * pratiques.
 *
 * Convention de clé : `<unitId>:x:<n>`. Ne jamais renommer une clé existante :
 * la progression de l'utilisateur y est rattachée.
 */

import manual from '@/data/exercises.manual.json';
import type { Exercise } from '@/game';

export const EXTRA_EXERCISES: readonly Exercise[] = (manual as { exercises: Exercise[] }).exercises;
