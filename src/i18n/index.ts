/**
 * Textes de l'interface, en anglais uniquement (1.3). `useT()` et `t()`
 * gardent leur forme : un écran n'a pas à savoir qu'il n'y a qu'une langue.
 */

import { translate, type Key, type Lang, type Params, type T } from './translate';

export { DICTS, detectLang, format, monthLabel, translate } from './translate';
export { formatDay, ordinal } from './format';
export type { Key, Lang, Params, T } from './translate';

export function currentLang(): Lang {
  return 'en';
}

export function useLang(): Lang {
  return 'en';
}

/** `const t = useT(); t('common.continue')`. */
export function useT(): T {
  return (key: Key, params?: Params) => translate('en', key, params);
}

/** Hors React (notifications, confirmations). */
export function t(key: Key, params?: Params): string {
  return translate('en', key, params);
}
