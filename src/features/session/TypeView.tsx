import { useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';

import type { QcmExercise } from '@/game';
import { answerMatches } from '@/lib/text';
import { useT } from '@/i18n';
import { CodeBlock, Text, radius, space, useColors } from '@/ui';

import { useSessionAction } from './SessionAction';

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
  const empty = value.trim() === '';

  // Le clavier se ferme avant le verdict : sinon il recouvre « Continuer ».
  const submit = () => {
    if (empty || locked) return;
    Keyboard.dismiss();
    onAnswer(correct);
  };

  const inlineAction = useSessionAction(locked ? null : { label: t('common.check'), disabled: empty, onPress: submit });

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
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        accessibilityLabel={t('session.typed.placeholder')}
        placeholder={t('session.typed.placeholder')}
        placeholderTextColor={colors.textSecondary}
        onSubmitEditing={submit}
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
      {inlineAction}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  input: { borderWidth: 2, borderRadius: radius.md, padding: space.md, fontSize: 18 },
});
