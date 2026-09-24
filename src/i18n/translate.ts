/**
 * Le cœur des traductions, sans dépendance à React ni au store : utilisable
 * par le contenu et par les tests.
 *
 * Syntaxe des valeurs :
 *   {name}                   interpolation d'un paramètre
 *   (one:jour|other:jours)   pluriel, choisi par le paramètre `count`
 */

import { en } from './en';
import { es } from './es';
import { fr } from './fr';

export type Lang = 'fr' | 'en' | 'es';
export type Key = keyof typeof fr;
export type Params = Record<string, string | number>;
export type T = (key: Key, params?: Params) => string;

export const LANGS: readonly { id: Lang; label: string; flag: string }[] = [
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
];

export const DICTS: Record<Lang, Record<Key, string>> = { fr, en, es };

const PLURAL = /\(one:([^|)]*)\|other:([^)]*)\)/g;
const PARAM = /\{(\w+)\}/g;

/** Singulier ou pluriel : en français, 0 et 1 sont au singulier (« 0 point »). */
function isOne(count: number, lang: Lang): boolean {
  return lang === 'fr' ? Math.abs(count) < 2 : Math.abs(count) === 1;
}

export function format(template: string, params?: Params, lang: Lang = 'en'): string {
  let out = template;
  if (params) {
    const count = params.count;
    if (typeof count === 'number') out = out.replace(PLURAL, (_m, one: string, other: string) => (isOne(count, lang) ? one : other));
    out = out.replace(PARAM, (m, name: string) => (name in params ? String(params[name]) : m));
  }
  return out;
}

export function translate(lang: Lang, key: Key, params?: Params): string {
  const template = DICTS[lang][key] ?? DICTS.fr[key] ?? key;
  return format(template, params, lang);
}

/** La langue du téléphone, si on la gère ; sinon l'anglais. */
export function detectLang(): Lang {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale ?? '').toLowerCase();
    if (locale.startsWith('fr')) return 'fr';
    if (locale.startsWith('es')) return 'es';
  } catch {
    // Pas d'Intl : anglais.
  }
  return 'en';
}

/**
 * « septembre 2026 » depuis « 2026-09 », dans la langue demandée. En français
 * et en espagnol le mois garde sa minuscule dans une phrase ; `standalone`
 * met la majuscule pour un libellé isolé (pastille de médaille).
 */
export function monthLabel(lang: Lang, month: string, standalone = false): string {
  const [y, m] = month.split('-').map(Number);
  try {
    const label = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(y, (m || 1) - 1, 1));
    return standalone ? label.charAt(0).toUpperCase() + label.slice(1) : label;
  } catch {
    return month;
  }
}
