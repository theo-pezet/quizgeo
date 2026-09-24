import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useReminderSync } from '@/features/reminders/useReminderSync';
import { useT } from '@/i18n';
import { useProgress, useSettings } from '@/store/progress';
import { fonts, palette } from '@/ui';

// L'écran de démarrage reste affiché jusqu'à ce que polices, réglages et
// progression soient prêts (voir RootLayout) : pas d'éclair du parcours vide.
void SplashScreen.preventAutoHideAsync()?.catch(() => undefined);

/**
 * Retour au premier plan : l'état est remis au présent (quêtes du jour,
 * semaine de ligue, défi du mois, énergie). Le focus d'un onglet ne se
 * déclenche pas quand l'app revient de l'arrière-plan.
 */
function useTickOnResume(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const store = useProgress.getState();
      if (store.hydrated) store.tick();
    });
    return () => sub.remove();
  }, []);
}

/** Les rappels ne se synchronisent qu'une fois la progression et les réglages relus. */
function ReminderSync(): null {
  useReminderSync();
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = useT();
  useTickOnResume();
  const [fontsLoaded, fontError] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const settingsHydrated = useSettings((s) => s.hydrated);
  const progressHydrated = useProgress((s) => s.hydrated);
  const colors = scheme === 'dark' ? palette.dark : palette.light;
  // Tant que rien n'est prêt, l'écran de démarrage reste affiché : pas de
  // parcours vide ni de barre d'onglets avant la redirection vers l'onboarding.
  // Une police qui ne se charge pas (fontError) laisse la police système.
  // Les stores passent toujours à « hydraté », même sur une erreur de lecture.
  const ready = (fontsLoaded || Boolean(fontError)) && settingsHydrated && progressHydrated;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()?.catch(() => undefined);
  }, [ready]);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ReminderSync />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fonts.extraBold },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: t('privacy.title'), presentation: 'modal' }} />
        <Stack.Screen name="session/[unitId]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="session/review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="session/free" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="session/blitz" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="deck/review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="placement/[subjectId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
