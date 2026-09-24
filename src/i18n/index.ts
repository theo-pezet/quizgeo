/**
 * Traductions de l'interface. Le français est la langue de référence : les
 * dictionnaires anglais et espagnol doivent avoir exactement les mêmes clés
 * (le compilateur le vérifie). Ici : les accès liés au réglage de langue.
 */

import { useSettings } from '@/store/progress';

import { detectLang, translate, type Key, type Lang, type Params, type T } from './translate';

export { DICTS, LANGS, detectLang, format, monthLabel, translate } from './translate';
export { formatDay, ordinal } from './format';
export type { Key, Lang, Params, T } from './translate';

export function currentLang(): Lang {
  return useSettings.getState().lang ?? detectLang();
}

export function useLang(): Lang {
  const lang = useSettings((s) => s.lang);
  return lang ?? detectLang();
}

/** `const t = useT(); t('common.continue')` : se met à jour quand la langue change. */
export function useT(): T {
  const lang = useLang();
  return (key: Key, params?: Params) => translate(lang, key, params);
}

/** Hors React (notifications, confirmations) : la langue courante. */
export function t(key: Key, params?: Params): string {
  return translate(currentLang(), key, params);
}
