import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useT } from '@/i18n';
import { Button, FadeUp, Icon, Shake, Text, space, useColors } from '@/ui';

import type { Feedback } from './useSession';

/** Couleurs de la barre du bas selon la réponse (fond, bordure, texte). */
export function feedbackTone(colors: ReturnType<typeof useColors>, correct: boolean) {
  return correct
    ? { background: colors.successSoft, border: colors.success, text: colors.success }
    : { background: colors.dangerSoft, border: colors.danger, text: colors.danger };
}

/**
 * Le verdict, affiché dans la barre FIXE du bas de l'écran (Screen.footer) :
 * le bouton « Continuer » est toujours visible sans défiler. Les
 * explications défilent dans la barre si elles sont longues.
 */
export function FeedbackPanel({ feedback, combo, onNext }: { feedback: Feedback; combo: number; onNext: () => void }) {
  const colors = useColors();
  const t = useT();
  const { height } = useWindowDimensions();
  const tone = feedbackTone(colors, feedback.correct);
  const hasWhy = !feedback.correct && !!feedback.whyWrong;
  return (
    <FadeUp>
      <Shake trigger={feedback.correct ? null : 1}>
        <View style={styles.panel}>
          <View style={styles.head}>
            <Icon name={feedback.correct ? 'checkmark-circle' : 'close-circle'} size={28} color={tone.text} />
            <Text variant="h2" style={{ color: tone.text }}>
              {feedback.correct ? (combo >= 3 ? t('session.correctCombo', { combo }) : t('session.correct')) : t('session.wrong')}
            </Text>
          </View>
          {(hasWhy || feedback.explain) && (
            <ScrollView style={{ maxHeight: Math.round(height * 0.3) }} contentContainerStyle={styles.body} showsVerticalScrollIndicator>
              {hasWhy && (
                <View style={[styles.why, { borderLeftColor: tone.border }]}>
                  <Text variant="small" style={[styles.label, { color: tone.text }]}>
                    {t('session.whyWrong')}
                  </Text>
                  <Text variant="small" style={styles.explain}>
                    {feedback.whyWrong}
                  </Text>
                </View>
              )}
              {feedback.explain && (
                <View style={styles.remember}>
                  {hasWhy && (
                    <Text variant="small" secondary style={styles.label}>
                      {t('session.remember')}
                    </Text>
                  )}
                  <Text variant="small" style={styles.explain}>
                    {feedback.explain}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          <Button label={t('common.continue')} tone={feedback.correct ? 'success' : 'danger'} onPress={onNext} />
        </View>
      </Shake>
    </FadeUp>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  body: { gap: space.md },
  explain: { lineHeight: 19 },
  label: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  why: { borderLeftWidth: 3, paddingLeft: space.sm, gap: 2 },
  remember: { gap: 2 },
});
