import { Alert, Platform } from 'react-native';

import { t } from '@/i18n';

/** Confirmation qui marche aussi sur le web, où Alert.alert n'existe pas. */
export function confirm(title: string, message: string, onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.confirm'), style: 'destructive', onPress: onConfirm },
  ]);
}
