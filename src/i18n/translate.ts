/**
 * Le cœur des traductions, sans dépendance à React ni au store : utilisable
 * par le contenu et par les tests.
 *
 * Syntaxe des valeurs :
 *   {name}                   interpolation d'un paramètre
 *   (one:jour|other:jours)   pluriel, choisi par le paramètre `count`
 */

import { en } from './en';

/** L'application est en anglais uniquement (1.3). Le type reste pour les signatures. */
export type Lang = 'en';
export type Key = keyof typeof en;
export type Params = Record<string, string | number>;
export type T = (key: Key, params?: Params) => string;

export const DICTS: Record<Lang, Record<Key, string>> = { en };

const PLURAL = /\(one:([^|)]*)\|other:([^)]*)\)/g;
const PARAM = /\{(\w+)\}/g;

/** Singulier ou pluriel : en anglais, seul 1 est au singulier (« 0 points »). */
function isOne(count: number): boolean {
  return Math.abs(count) === 1;
}

export function format(template: string, params?: Params, _lang: Lang = 'en'): string {
  let out = template;
  if (params) {
    const count = params.count;
    if (typeof count === 'number') out = out.replace(PLURAL, (_m, one: string, other: string) => (isOne(count) ? one : other));
    out = out.replace(PARAM, (m, name: string) => (name in params ? String(params[name]) : m));
  }
  return out;
}

export function translate(lang: Lang, key: Key, params?: Params): string {
  const template = DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
  return format(template, params, lang);
}

/** L'application est en anglais uniquement. */
export function detectLang(): Lang {
  return 'en';
}

/** « September 2026 » depuis « 2026-09 ». `standalone` : majuscule garantie (pastille de médaille). */
export function monthLabel(lang: Lang, month: string, standalone = false): string {
  const [y, m] = month.split('-').map(Number);
  try {
    const label = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(y, (m || 1) - 1, 1));
    return standalone ? label.charAt(0).toUpperCase() + label.slice(1) : label;
  } catch {
    return month;
  }
}
