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

export function format(template: string, params?: Params): string {
  let out = template;
  if (params) {
    const count = params.count;
    if (typeof count === 'number') out = out.replace(PLURAL, (_m, one: string, other: string) => (Math.abs(count) === 1 ? one : other));
    out = out.replace(PARAM, (m, name: string) => (name in params ? String(params[name]) : m));
  }
  return out;
}

export function translate(lang: Lang, key: Key, params?: Params): string {
  const template = DICTS[lang][key] ?? DICTS.fr[key] ?? key;
  return format(template, params);
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
