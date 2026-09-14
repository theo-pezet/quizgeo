import { StyleSheet, View } from 'react-native';

import { MONTHLY_TARGET, monthlyRatio, type MonthlyState } from '@/game';
import { monthLabel, useLang, useT } from '@/i18n';

import { Card } from './Card';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { space, useColors } from './tokens';

/** Le défi du mois : vingt leçons, une médaille. Compact, sous les quêtes. */
export function MonthlyCard({ monthly, month }: { monthly: MonthlyState; month: string }) {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
  const label = monthLabel(lang, month);
  const done = monthly.claimed && monthly.month === month;
  const lessons = monthly.month === month ? monthly.lessons : 0;
  return (
    <Card color={done ? colors.gold : undefined}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Icon name="medal" size={18} color={colors.gold} />
          <Text variant="bodyBold">{t('monthly.title', { month: label })}</Text>
        </View>
        <Text variant="small" secondary>
          {Math.min(lessons, MONTHLY_TARGET)}/{MONTHLY_TARGET}
        </Text>
      </View>
      <ProgressBar ratio={monthlyRatio({ ...monthly, lessons })} height={8} color={done ? colors.gold : colors.streak} />
      <Text variant="small" secondary>
        {done ? t('monthly.done', { month: label }) : t('monthly.body', { lessons, target: MONTHLY_TARGET })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
