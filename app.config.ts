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
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'quizgeo',
  userInterfaceStyle: 'automatic',
  android: {
    // Ne jamais changer : la fiche Play Store et l'app AdMob y seront liées.
    package: 'fr.citeparlia.quizgeo',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#5B4BFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // Un seul index.html : le routage est côté client, et GitHub Pages sert
    // 404.html (copie d'index.html) pour les liens profonds et le rechargement.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
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
