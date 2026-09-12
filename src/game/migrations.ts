/**
 * Migration de la progression persistée. Le schéma s'enrichit (énergie,
 * gemmes, quêtes, ligue, boost) sans jamais perdre ce que l'utilisateur a
 * gagné : chaque champ manquant prend sa valeur par défaut, les champs
 * connus sont conservés tels quels.
 */

import { emptyProgress, type Progress } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Fusion superficielle par section : les objets connus sont complétés, pas remplacés. */
export function migrateProgress(raw: unknown): Progress {
  const base = emptyProgress();
  if (!isObject(raw)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base) as (keyof Progress)[]) {
    const incoming = raw[key];
    if (incoming === undefined) continue;
    const template = base[key];
    if (isObject(template) && isObject(incoming)) {
      out[key] = { ...template, ...incoming };
    } else if (typeof template === typeof incoming) {
      out[key] = incoming;
    }
  }
  out.schemaVersion = 1;
  return out as unknown as Progress;
}
