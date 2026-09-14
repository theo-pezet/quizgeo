import type { ExpoConfig } from 'expo/config';

/**
 * Configuration Expo.
 *
 * Un fichier TypeScript plutôt qu'un app.json : le plugin AdMob (plus tard)
 * et le chemin de base du site web (GitHub Pages) s'y ajoutent sans tout
 * réécrire. `EXPO_PUBLIC_BASE_PATH` est posé par le workflow Pages.
 */
const basePath = process.env.EXPO_PUBLIC_BASE_PATH ?? '';

const config: ExpoConfig = {
  name: 'Quiz GEO',
  slug: 'quizgeo',
  version: '0.8.2',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'quizgeo',
  userInterfaceStyle: 'automatic',
  android: {
    // Ne jamais changer : la fiche Play Store et l'app AdMob y seront liées.
    package: 'fr.citeparlia.quizgeo',
    // Incrémenté automatiquement par EAS en production (eas.json).
    versionCode: 11,
    adaptiveIcon: {
      backgroundColor: '#5B4BFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Aucune de ces permissions n'est utile : on les retire du manifeste
    // final (expo-audio ajoute RECORD_AUDIO, le gabarit ajoute le stockage
    // et la fenêtre superposée du menu de développement).
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    // Un seul index.html : le routage est côté client, et GitHub Pages sert
    // 404.html (copie d'index.html) pour les liens profonds et le rechargement.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-notifications', { color: '#5B4BFF', icon: './assets/images/notification-icon.png' }],
    [
      'expo-splash-screen',
      { backgroundColor: '#5B4BFF', image: './assets/images/splash-icon.png', imageWidth: 96 },
    ],
  ],
  experiments: {
    baseUrl: basePath,
    typedRoutes: false,
    reactCompiler: false,
  },
};

export default config;
