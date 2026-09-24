/**
 * Migration de la progression persistée. Le schéma s'enrichit (énergie,
 * gemmes, quêtes, ligue, boost) sans jamais perdre ce que l'utilisateur a
 * gagné : chaque champ manquant prend sa valeur par défaut, les champs
 * connus sont conservés tels quels.
 */

import codeKeysV1_1 from './data/code-keys-v1.1.json';
import { emptyProgress, emptyQuestionProgress, type Progress } from './types';

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

// ---------------------------------------------------------------------------
// v3 (Skilltrail 1.1) : les exercices « lis le code » ajoutés aux unités
// Python et Web existantes.
// ---------------------------------------------------------------------------

/**
 * Les clés des 529 exercices ajoutés en 1.1 à des unités qui existaient déjà,
 * par unité. Liste FIGÉE (tirée de src/data/code.extra.json à la sortie de la
 * 1.1.1) : un ajout futur ne doit pas rejouer cette migration, il aura la
 * sienne. Toute clé d'exercice commence par « <unitId>: ».
 */
export const CODE_KEYS_V1_1: Readonly<Record<string, readonly string[]>> = codeKeysV1_1;

/**
 * Hérite le niveau d'une unité sur les exercices qui lui ont été ajoutés.
 *
 * Les couronnes d'une unité sont fixées par le streak MINIMAL de ses
 * exercices : sans cette migration, un exercice jamais vu (streak 0) ramène
 * toute unité terminée en 1.0 à 1 couronne. Pour chaque unité déjà acquise
 * (première couronne latchée) dont les anciens exercices ont tous un streak
 * d'au moins 1, chaque exercice ajouté ABSENT de la progression reçoit le
 * streak minimal de ces anciens exercices et leur date la plus récente :
 * l'unité garde exactement ses couronnes.
 *
 * Ne touche jamais une entrée existante (un joueur de la 1.1 garde ses vraies
 * réponses) et ne fait donc jamais baisser une couronne. Pure et idempotente.
 */
export function grandfatherNewExercises(
  progress: Progress,
  added: Readonly<Record<string, readonly string[]>>,
): Progress {
  const questions = { ...progress.questions };
  let changed = false;
  for (const [unitId, keys] of Object.entries(added)) {
    if (progress.units[unitId]?.firstTraitEarned !== true) continue;
    const addedKeys = new Set(keys);
    const prefix = `${unitId}:`;
    // Entrées illisibles (cache abîmé) : ignorées, jamais recopiées.
    const old = Object.entries(progress.questions)
      .filter(([key, q]) => key.startsWith(prefix) && !addedKeys.has(key) && isObject(q) && Number.isFinite(q.streak))
      .map(([, q]) => q);
    if (old.length === 0) continue;
    const streak = Math.min(...old.map((q) => q.streak));
    if (streak < 1) continue;
    let lastSeenAt: string | null = null;
    for (const q of old) {
      if (typeof q.lastSeenAt === 'string' && (lastSeenAt === null || q.lastSeenAt > lastSeenAt)) lastSeenAt = q.lastSeenAt;
    }
    for (const key of keys) {
      if (questions[key] !== undefined) continue;
      questions[key] = { ...emptyQuestionProgress(key), seen: 1, correct: 1, streak, lastAnswerCorrect: true, lastSeenAt };
      changed = true;
    }
  }
  return changed ? { ...progress, questions } : progress;
}

/**
 * Migration d'une progression persistée en version `fromVersion` (celle du
 * store) vers la version courante. Les champs manquants sont toujours
 * complétés ; les transformations datées ne s'appliquent qu'une fois.
 */
export function migratePersistedProgress(raw: unknown, fromVersion: number): Progress {
  let progress = migrateProgress(raw);
  if (fromVersion < 3) progress = grandfatherNewExercises(progress, CODE_KEYS_V1_1);
  return progress;
}
