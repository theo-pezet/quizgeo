import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/store/progress';

/** Respecte le réglage « Vibrations » du Profil ; aucun échec ne remonte. */
async function safe(fn: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  try {
    await fn();
  } catch {
    // Pas de moteur haptique : on ignore.
  }
}

export const haptics = {
  correct: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  wrong: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
