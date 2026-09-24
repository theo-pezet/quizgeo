/**
 * Frontière avec le système de notifications du téléphone.
 *
 * La règle (quoi, quand) est dans src/game/reminders.ts. Ici : demander la
 * permission, annuler ce qui était programmé, programmer la nouvelle liste.
 * Sur le web, il ne se passe rien.
 */

import { Platform } from 'react-native';

import { planReminders, type ReminderPrefs, type ReminderTexts, type Progress } from '@/game';
import { t } from '@/i18n';
import { useSettings } from '@/store/progress';

/** Canal Android des rappels (Android 8+ exige un canal ; sinon « Miscellaneous », non traduit). */
export const REMINDER_CHANNEL_ID = 'reminders';

function texts(): ReminderTexts {
  return {
    streakTitle: (count) => (count > 0 ? t('reminder.streak.title', { count }) : t('reminder.streak.titleNew')),
    streakBody: (count) => (count > 0 ? t('reminder.streak.body') : t('reminder.streak.bodyNew')),
    energyTitle: t('reminder.energy.title'),
    energyBody: t('reminder.energy.body'),
    lapseTitle: (days) => t('reminder.lapse.title', { count: days }),
    lapseBody: () => t('reminder.lapse.body'),
  };
}

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

/**
 * Crée (ou renomme, dans la langue courante) le canal Android des rappels.
 * Sans effet ailleurs. Rappelée à chaque synchronisation : c'est idempotent,
 * et le nom suit un changement de langue.
 */
async function ensureChannel(mod: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await mod.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: t('reminder.channel'),
    importance: mod.AndroidImportance.DEFAULT,
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  const mod = loadModule();
  if (mod === null) return false;
  try {
    // Android 13+ : la demande de permission ne s'affiche qu'une fois un canal créé.
    await ensureChannel(mod).catch(() => undefined);
    const current = await mod.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await mod.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

async function doSync(progress: Progress, enabled: boolean, prefs: ReminderPrefs): Promise<void> {
  const mod = loadModule();
  if (mod === null) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    await ensureChannel(mod).catch(() => undefined);
    for (const reminder of planReminders(progress, new Date(), prefs, texts())) {
      // Réglage coupé pendant la synchronisation : on s'arrête là.
      if (!useSettings.getState().reminders) {
        await mod.cancelAllScheduledNotificationsAsync();
        return;
      }
      await mod.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body },
        trigger: { type: mod.SchedulableTriggerInputTypes.DATE, date: reminder.at, channelId: REMINDER_CHANNEL_ID },
      });
    }
  } catch {
    // Un système sans notifications (émulateur sans services) ne doit pas faire planter l'app.
  }
}

/** File d'attente : une synchronisation ne démarre qu'une fois la précédente finie. */
let queue: Promise<void> = Promise.resolve();

/**
 * Reprogramme tous les rappels depuis l'état courant. Idempotent. Les appels
 * sont sérialisés : sans cela, une synchronisation lancée plus tôt pourrait
 * reprogrammer des rappels entre le « tout annuler » d'une plus récente et la
 * fin de celle-ci (rappels coupés dans le Profil, mais programmés quand même).
 */
export function syncReminders(progress: Progress, enabled: boolean, prefs: ReminderPrefs): Promise<void> {
  queue = queue.then(() => doSync(progress, enabled, prefs));
  return queue;
}
