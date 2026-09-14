import { useContent } from '@/content/useContent';
import { useT } from '@/i18n';
import { Card, Screen, Text } from '@/ui';

/** Politique de confidentialité, aussi exigée par le Play Store. */
export default function PrivacyScreen() {
  const t = useT();
  const { UNITS, EXERCISES, CARDS } = useContent();
  const sections = ['local', 'permissions', 'league', 'ads', 'delete'] as const;
  return (
    <Screen>
      <Text variant="title">{t('privacy.title')}</Text>
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
