/**
 * Mise en forme des dates dans la langue de l'interface. Les dates du jeu
 * sont des DayKey (« AAAA-MM-JJ ») : on ne les montre jamais telles quelles.
 */

import type { Lang } from './translate';

const DEFAULT_DAY: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };

/**
 * « mardi 23 septembre » (fr), « Tuesday, September 23 » (en),
 * « martes 23 de septiembre » (es) depuis « 2026-09-23 ». Accepte aussi une
 * date ISO complète (seule la partie jour compte). Sans Intl ou avec une
 * valeur illisible, renvoie la valeur d'origine.
 */
export function formatDay(dayKey: string, lang: Lang, options: Intl.DateTimeFormatOptions = DEFAULT_DAY): string {
  const [y, m, d] = dayKey.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return dayKey;
  try {
    // Midi local : aucun décalage horaire ne peut faire changer de jour.
    const out = new Intl.DateTimeFormat(lang, options).format(new Date(y, m - 1, d, 12));
    // En espagnol, dans une phrase : « el martes 23 de septiembre », sans virgule.
    return lang === 'es' && options.weekday ? out.replace(/^(\p{L}+),\s/u, '$1 ') : out;
  } catch {
    return dayKey;
  }
}

/**
 * Rang ordinal : « 1ᵉʳ », « 2ᵉ » (fr), « 1st », « 22nd », « 13th » (en),
 * « 1.º » (es). Pour les classements de ligue.
 */
export function ordinal(n: number, lang: Lang): string {
  if (lang === 'fr') return n === 1 ? '1ᵉʳ' : `${n}ᵉ`;
  if (lang === 'es') return `${n}.º`;
  const suffix: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
  try {
    return `${n}${suffix[new Intl.PluralRules('en', { type: 'ordinal' }).select(n)] ?? 'th'}`;
  } catch {
    const mod100 = n % 100;
    const mod10 = n % 10;
    return `${n}${mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'}`;
  }
}
