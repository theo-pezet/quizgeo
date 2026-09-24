import { Stack } from 'expo-router';

import { useContent } from '@/content/useContent';
import { useT } from '@/i18n';
import { Card, Screen, Text, fonts, useColors } from '@/ui';

/**
 * Politique de confidentialité, aussi exigée par le Play Store. Le titre est
 * celui de l'en-tête de la modale (pas répété dans la page), aux couleurs du
 * thème : sans cela l'en-tête restait blanc en thème sombre.
 */
export default function PrivacyScreen() {
  const t = useT();
  const colors = useColors();
  const { UNITS, EXERCISES, CARDS } = useContent();
  const sections = ['local', 'permissions', 'league', 'ads', 'delete'] as const;
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t('privacy.title'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.extraBold, color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      {sections.map((s) => (
        <Card key={s}>
          <Text variant="bodyBold">{t(`privacy.${s}.title`)}</Text>
          <Text variant="small">{t(`privacy.${s}.body`)}</Text>
        </Card>
      ))}
      <Text variant="small" secondary>
        {t('privacy.footer', { units: UNITS.length, exercises: EXERCISES.length, cards: CARDS.length })}
      </Text>
    </Screen>
  );
}
