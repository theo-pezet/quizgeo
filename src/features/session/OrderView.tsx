import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { shuffle, type OrderExercise } from '@/game';
import { useT } from '@/i18n';
import { Button, Text, radius, space, useColors } from '@/ui';

interface Props {
  exercise: OrderExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

export function OrderView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => shuffle(exercise.steps, Math.random), [exercise.key]);
  const [chosen, setChosen] = useState<string[]>([]);
  const remaining = pool.filter((s) => !chosen.includes(s));
  const isCorrect = chosen.length === exercise.steps.length && chosen.every((s, i) => s === exercise.steps[i]);

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt}</Text>
      <View style={styles.list}>
        {chosen.map((step, i) => (
          <Pressable
            key={step}
            disabled={locked}
            onPress={() => setChosen(chosen.filter((s) => s !== step))}
            style={[
              styles.step,
              {
                borderColor: locked ? (step === exercise.steps[i] ? colors.success : colors.danger) : colors.primary,
                backgroundColor: colors.surface,
              },
            ]}>
            <Text variant="bodyBold" style={{ color: colors.primary }}>
              {i + 1}.
            </Text>
            <Text variant="small" style={styles.stepText}>
              {step}
            </Text>
          </Pressable>
        ))}
        {chosen.length === 0 && (
          <Text variant="small" secondary>
            {t('session.order.hint')}
          </Text>
        )}
      </View>
      {locked && !isCorrect && (
        <View style={[styles.solution, { backgroundColor: colors.successSoft }]}>
          <Text variant="small" style={{ color: colors.success }}>
            {t('session.order.solution')}
          </Text>
          {exercise.steps.map((s, i) => (
            <Text key={s} variant="small">
              {i + 1}. {s}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.pool}>
        {remaining.map((step) => (
          <Pressable
            key={step}
            disabled={locked}
            onPress={() => setChosen([...chosen, step])}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <Text variant="small">{step}</Text>
          </Pressable>
        ))}
      </View>
      {!locked && (
        <Button label={t('common.check')} disabled={chosen.length !== exercise.steps.length} onPress={() => onAnswer(isCorrect)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  list: { gap: space.sm },
  step: { flexDirection: 'row', gap: space.sm, borderWidth: 2, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  stepText: { flex: 1 },
  pool: { gap: space.sm },
  chip: { borderWidth: 1, borderRadius: radius.md, padding: space.md },
  solution: { borderRadius: radius.md, padding: space.md, gap: space.xs },
});
