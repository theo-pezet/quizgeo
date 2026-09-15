import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { presentQcm, type QcmExercise } from '@/game';
import { useT } from '@/i18n';
import { Button, CodeBlock, Text, radius, space, useColors } from '@/ui';

interface Props {
  exercise: QcmExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
  /** Libellé du bouton (par défaut « Vérifier »). Le test de niveau met « Suivant ». */
  checkLabel?: string;
}

export function QcmView({ exercise, onAnswer, locked, checkLabel }: Props) {
  const colors = useColors();
  const t = useT();
  // Mélangé à chaque affichage, y compris entre deux apparitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presented = useMemo(() => presentQcm(exercise, Math.random), [exercise.key]);
  const [selected, setSelected] = useState<number | null>(null);
  const isTrueFalse = presented.choices.length === 2;

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt}</Text>
      {exercise.code && <CodeBlock code={exercise.code} />}
      <View style={[styles.choices, isTrueFalse && styles.row]}>
        {presented.choices.map((choice, i) => {
          const isSelected = selected === i;
          let border = colors.border;
          let bg = colors.surface;
          if (locked && i === presented.answer) {
            border = colors.success;
            bg = colors.successSoft;
          } else if (locked && isSelected) {
            border = colors.danger;
            bg = colors.dangerSoft;
          } else if (isSelected) {
            border = colors.primary;
            bg = colors.surfaceAlt;
          }
          return (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => setSelected(i)}
              style={[styles.choice, { borderColor: border, backgroundColor: bg }, isTrueFalse && styles.half]}>
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {!locked && (
        <Button label={checkLabel ?? t('common.check')} disabled={selected === null} onPress={() => onAnswer(selected === presented.answer)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  choices: { gap: space.sm },
  row: { flexDirection: 'row' },
  half: { flex: 1, alignItems: 'center' },
  choice: { borderWidth: 2, borderRadius: radius.md, padding: space.md },
  choiceText: { fontSize: 15, lineHeight: 21 },
});
