import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { shuffle, type ClozeExercise } from '@/game';
import { useT } from '@/i18n';
import { Text, radius, space, useColors } from '@/ui';

import { useSessionAction } from './SessionAction';

interface Props {
  exercise: ClozeExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

export function ClozeView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bank = useMemo(() => shuffle([exercise.answer, ...exercise.bank], Math.random), [exercise.key]);
  const [picked, setPicked] = useState<string | null>(null);
  const [before, after] = exercise.text.split('___');
  const inlineAction = useSessionAction(
    locked ? null : { label: t('common.check'), disabled: picked === null, onPress: () => picked !== null && onAnswer(picked === exercise.answer) },
  );

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{t('session.cloze.title')}</Text>
      <Text variant="body">
        {before}
        <Text
          variant="bodyBold"
          style={{
            color: locked ? (picked === exercise.answer ? colors.success : colors.danger) : colors.primary,
            textDecorationLine: 'underline',
          }}>
          {picked ?? '______'}
        </Text>
        {after}
      </Text>
      {locked && picked !== exercise.answer && (
        <Text variant="small" style={{ color: colors.success }}>
          {t('session.cloze.answer', { answer: exercise.answer })}
        </Text>
      )}
      <View style={styles.bank}>
        {bank.map((word) => (
          <Pressable
            key={word}
            disabled={locked}
            onPress={() => setPicked(word)}
            accessibilityRole="button"
            accessibilityState={{ selected: picked === word, disabled: locked }}
            style={[
              styles.chip,
              {
                borderColor: picked === word ? colors.primary : colors.border,
                backgroundColor: picked === word ? colors.surfaceAlt : colors.surface,
              },
            ]}>
            <Text variant="small">{word}</Text>
          </Pressable>
        ))}
      </View>
      {inlineAction}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md },
});
