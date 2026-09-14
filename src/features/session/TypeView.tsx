import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { QcmExercise } from '@/game';
import { answerMatches } from '@/lib/text';
import { useT } from '@/i18n';
import { Button, CodeBlock, Text, radius, space, useColors } from '@/ui';

interface Props {
  exercise: QcmExercise & { typed: NonNullable<QcmExercise['typed']> };
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

/** Aux couronnes 4 et 5 : plus de choix, on tape la réponse. */
export function TypeView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  const [value, setValue] = useState('');
  const correct = answerMatches(value, exercise.typed.answer, exercise.typed.accept);

  return (
    <View style={styles.wrap}>
      <Text variant="small" style={{ color: colors.gold }}>
        {t('session.typed.mode')}
      </Text>
      <Text variant="h2">{exercise.prompt}</Text>
      {exercise.code && <CodeBlock code={exercise.code} />}
      <TextInput
        value={value}
        onChangeText={setValue}
        editable={!locked}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('session.typed.placeholder')}
        placeholderTextColor={colors.textSecondary}
        onSubmitEditing={() => value.trim() !== '' && onAnswer(correct)}
        style={[
          styles.input,
          {
            borderColor: locked ? (correct ? colors.success : colors.danger) : colors.primary,
            backgroundColor: colors.surface,
            color: colors.text,
          },
        ]}
      />
      {locked && !correct && (
        <Text variant="small" style={{ color: colors.success }}>
          {t('session.typed.expected', { answer: exercise.typed.answer })}
        </Text>
      )}
      {!locked && <Button label={t('common.check')} disabled={value.trim() === ''} onPress={() => onAnswer(correct)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  input: { borderWidth: 2, borderRadius: radius.md, padding: space.md, fontSize: 18 },
});
