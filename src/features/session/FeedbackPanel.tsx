import { StyleSheet, View } from 'react-native';

import { Button, Text, radius, space, useColors } from '@/ui';

import type { Feedback } from './useSession';

export function FeedbackPanel({ feedback, combo, onNext }: { feedback: Feedback; combo: number; onNext: () => void }) {
  const colors = useColors();
  const tone = feedback.correct ? colors.success : colors.danger;
  return (
    <View style={[styles.panel, { backgroundColor: feedback.correct ? colors.successSoft : colors.dangerSoft, borderColor: tone }]}>
      <View style={styles.head}>
        <Text variant="h2" style={{ color: tone }}>
          {feedback.correct ? (combo >= 3 ? `Exact ! 🔥 ×${combo}` : 'Exact !') : 'Pas tout à fait'}
        </Text>
      </View>
      {feedback.explain && (
        <Text variant="small" style={styles.explain}>
          {feedback.explain}
        </Text>
      )}
      <Button label="Continuer" tone={feedback.correct ? 'success' : 'danger'} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  explain: { lineHeight: 19 },
});
