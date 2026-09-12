import { useEffect } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_REMINDER_PREFS } from '@/game';
import { syncReminders } from '@/lib/notifications';
import { useProgress, useSettings } from '@/store/progress';

/**
 * Reprogramme les rappels quand l'app passe en arrière-plan (c'est là qu'ils
 * servent) et quand le réglage change. Un seul point d'entrée, dans la racine.
 */
export function useReminderSync(): void {
  const reminders = useSettings((s) => s.reminders);
  const streakHour = useSettings((s) => s.reminderHour);

  useEffect(() => {
    const sync = () => {
      const { progress } = useProgress.getState();
      void syncReminders(progress, reminders, { ...DEFAULT_REMINDER_PREFS, streakHour });
    };
    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') sync();
    });
    return () => sub.remove();
  }, [reminders, streakHour]);
}
