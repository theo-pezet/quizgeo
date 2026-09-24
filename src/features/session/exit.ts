import { router } from 'expo-router';

/**
 * Quitter une session : retour à l'écran précédent, ou au parcours quand la
 * session a été ouverte directement (lien, notification, rechargement web).
 */
export function exitSession(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
