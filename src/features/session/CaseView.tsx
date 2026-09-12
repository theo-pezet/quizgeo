import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CaseExercise } from '@/game';
import { Button, Card, Text, radius, space, useColors } from '@/ui';

interface Props {
  exercise: CaseExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

/** Cas pratique : une décision à la fois, un retour immédiat, puis la suivante. */
export function CaseView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState(0);

  const step = exercise.steps[stepIndex];
  const isLast = stepIndex === exercise.steps.length - 1;

  const check = () => {
    if (selected === null) return;
    setChecked(true);
    if (selected !== step.answer) setWrong((w) => w + 1);
  };

  const proceed = () => {
    const allRight = wrong === 0;
    if (isLast) {
      onAnswer(allRight);
      return;
    }
    setStepIndex(stepIndex + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <View style={styles.wrap}>
      <Text variant="h2">📋 {exercise.title}</Text>
      <Card>
        <Text variant="body">{exercise.scenario}</Text>
      </Card>
      <Text variant="small" secondary>
        Décision {stepIndex + 1} / {exercise.steps.length}
      </Text>
      <Text variant="bodyBold">{step.prompt}</Text>
      <View style={styles.choices}>
        {step.choices.map((choice, i) => {
          let border = colors.border;
          let bg = colors.surface;
          if (checked && i === step.answer) {
            border = colors.success;
            bg = colors.successSoft;
          } else if (checked && selected === i) {
            border = colors.danger;
            bg = colors.dangerSoft;
          } else if (selected === i) {
            border = colors.primary;
            bg = colors.surfaceAlt;
          }
          return (
            <Pressable
              key={i}
              disabled={checked || locked}
              onPress={() => setSelected(i)}
              style={[styles.choice, { borderColor: border, backgroundColor: bg }]}>
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {checked && (
        <View style={[styles.feedback, { backgroundColor: selected === step.answer ? colors.successSoft : colors.dangerSoft }]}>
          <Text variant="small">{step.feedback}</Text>
        </View>
      )}
      {!locked &&
        (checked ? (
          <Button label={isLast ? 'Terminer le cas' : 'Décision suivante'} onPress={proceed} />
        ) : (
          <Button label="Valider" disabled={selected === null} onPress={check} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  choices: { gap: space.sm },
  choice: { borderWidth: 2, borderRadius: radius.md, padding: space.md },
  choiceText: { fontSize: 15, lineHeight: 21 },
  feedback: { borderRadius: radius.md, padding: space.md },
});
