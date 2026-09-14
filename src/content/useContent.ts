import { currentLang, useLang } from '@/i18n';

import { contentFor, type Content } from './index';

/** Le contenu dans la langue de l'utilisateur ; change avec le réglage. */
export function useContent(): Content {
  return contentFor(useLang());
}

/** Hors React : le contenu dans la langue courante. */
export function content(): Content {
  return contentFor(currentLang());
}
