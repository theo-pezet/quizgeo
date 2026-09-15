// @ts-nocheck : outil de développement, utilise fs/path de Node.
/**
 * Export du contenu localisé en JSON, pour les outils de relecture
 * (tools/build_confusables.py, tools/review/*). Ne fait rien sans la
 * variable EXPORT_CONTENT_DIR :
 *   EXPORT_CONTENT_DIR=/tmp/export npx jest src/content/__tests__/export.test.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { contentFor } from '..';

const dir = process.env.EXPORT_CONTENT_DIR;

(dir ? it : it.skip)('exporte cartes et exercices dans les trois langues', () => {
  mkdirSync(dir as string, { recursive: true });
  for (const lang of ['fr', 'en', 'es'] as const) {
    const c = contentFor(lang);
    writeFileSync(join(dir as string, `cards.${lang}.json`), JSON.stringify(c.CARDS, null, 1));
    writeFileSync(join(dir as string, `exercises.${lang}.json`), JSON.stringify(c.EXERCISES, null, 1));
    writeFileSync(join(dir as string, `units.${lang}.json`), JSON.stringify(c.UNITS.map((u) => ({ id: u.id, subjectId: u.subjectId, title: u.title, description: u.description })), null, 1));
  }
  expect(true).toBe(true);
});
