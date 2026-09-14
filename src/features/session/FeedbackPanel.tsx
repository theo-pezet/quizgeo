import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { Button, FadeUp, Icon, Shake, Text, radius, space, useColors } from '@/ui';

import type { Feedback } from './useSession';

export function FeedbackPanel({ feedback, combo, onNext }: { feedback: Feedback; combo: number; onNext: () => void }) {
  const colors = useColors();
  const t = useT();
  const tone = feedback.correct ? colors.success : colors.danger;
  return (
    <FadeUp>
      <Shake trigger={feedback.correct ? null : 1}>
        <View style={[styles.panel, { backgroundColor: feedback.correct ? colors.successSoft : colors.dangerSoft, borderColor: tone }]}>
          <View style={styles.head}>
            <Icon name={feedback.correct ? 'checkmark-circle' : 'close-circle'} size={26} color={tone} />
            <Text variant="h2" style={{ color: tone }}>
              {feedback.correct ? (combo >= 3 ? t('session.correctCombo', { combo }) : t('session.correct')) : t('session.wrong')}
            </Text>
          </View>
          {feedback.explain && (
            <Text variant="small" style={styles.explain}>
              {feedback.explain}
            </Text>
          )}
          <Button label={t('common.continue')} tone={feedback.correct ? 'success' : 'danger'} onPress={onNext} />
        </View>
      </Shake>
    </FadeUp>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  explain: { lineHeight: 19 },
});
