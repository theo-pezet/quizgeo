/**
 * Frontière avec le système de notifications du téléphone.
 *
 * La règle (quoi, quand) est dans src/game/reminders.ts. Ici : demander la
 * permission, annuler ce qui était programmé, programmer la nouvelle liste.
 * Sur le web, il ne se passe rien.
 */

import { Platform } from 'react-native';

import { planReminders, type ReminderPrefs, type Progress } from '@/game';

type NotificationsModule = typeof import('expo-notifications');

let moduleCache: NotificationsModule | null = null;

function loadModule(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (moduleCache === null) {
    // Chargé à la demande : le module ne doit jamais s'exécuter sur le web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduleCache = require('expo-notifications') as NotificationsModule;
  }
  return moduleCache;
}

export async function requestReminderPermission(): Promise<boolean> {
  const mod = loadModule();
  if (mod === null) return false;
  try {
    const current = await mod.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await mod.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Reprogramme tous les rappels depuis l'état courant. Idempotent. */
export async function syncReminders(progress: Progress, enabled: boolean, prefs: ReminderPrefs): Promise<void> {
  const mod = loadModule();
  if (mod === null) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    for (const reminder of planReminders(progress, new Date(), prefs)) {
      await mod.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: { type: mod.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      });
    }
  } catch {
    // Un système sans notifications (émulateur sans services) ne doit pas faire planter l'app.
  }
}
