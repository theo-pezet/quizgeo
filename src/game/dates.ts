/**
 * Jours locaux. Minuit LOCAL est la frontière.
 *
 * Toutes ces fonctions travaillent sur des DayKey ("2026-09-09"), jamais sur
 * des instants. C'est ce qui rend la série insensible aux fuseaux : on compare
 * des étiquettes de jour, pas des durées.
 *
 * src/lib/dates.ts se contente de ré-exporter ce module et d'y ajouter ce qui
 * touche à la plateforme (formats localisés).
 */

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
  return typeof value === 'string' && DAY_KEY.test(value);
}

/** Étiquette du jour LOCAL d'un instant. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Décale une étiquette de jour de `days` jours.
 *
 * Passe par un Date en UTC volontairement : on manipule une étiquette
 * calendaire, pas un instant. Un 25 octobre + 1 jour donne le 26 octobre,
 * que la nuit ait duré 23, 24 ou 25 heures.
 */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return toDayKeyUtc(new Date(base + days * 86400000));
}

function toDayKeyUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Nombre de jours calendaires de `from` à `to`. Négatif si `to` précède. */
export function daysBetween(from: string, to: string): number {
  const parse = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

/** Heure locale d'un instant, 0..23. Sert aux badges Lève-tôt / Noctambule. */
export function localHour(date: Date): number {
  return date.getHours();
}
