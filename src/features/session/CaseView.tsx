import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CaseExercise } from '@/game';
import { useT } from '@/i18n';
import { Card, Text, radius, space, useColors } from '@/ui';

import { presentCaseStep } from './present';
import { useScrollToTop, useSessionAction } from './SessionAction';

interface Props {
  exercise: CaseExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

/** Cas pratique : une décision à la fois, un retour immédiat, puis la suivante. */
export function CaseView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  const scrollToTop = useScrollToTop();
  // Chaque étape est mélangée une fois par affichage (la bonne réponse est
  // stockée en premier dans le contenu), puis reste stable pendant l'étape.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presented = useMemo(() => exercise.steps.map((s) => presentCaseStep(s, Math.random)), [exercise.key]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState(0);

  const step = exercise.steps[stepIndex];
  const shown = presented[stepIndex];
  const isLast = stepIndex === exercise.steps.length - 1;
  const stepRight = selected === shown.answer;

  const check = () => {
    if (selected === null) return;
    setChecked(true);
    if (selected !== shown.answer) setWrong((w) => w + 1);
  };

  const proceed = () => {
    if (isLast) {
      onAnswer(wrong === 0);
      return;
    }
    setStepIndex(stepIndex + 1);
    setSelected(null);
    setChecked(false);
    scrollToTop();
  };

  const inlineAction = useSessionAction(
    locked
      ? null
      : checked
        ? {
            label: isLast ? t('session.case.finish') : t('session.case.next'),
            onPress: proceed,
            note: { text: step.feedback, correct: stepRight },
          }
        : { label: t('common.check'), disabled: selected === null, onPress: check },
  );

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.title}</Text>
      <Card>
        <Text variant="body">{exercise.scenario}</Text>
      </Card>
      <Text variant="small" secondary>
        {t('session.case.decision', { index: stepIndex + 1, total: exercise.steps.length })}
      </Text>
      <Text variant="bodyBold">{step.prompt}</Text>
      <View style={styles.choices}>
        {shown.choices.map((choice, i) => {
          let border = colors.border;
          let bg = colors.surface;
          if (checked && i === shown.answer) {
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
              key={`${stepIndex}:${i}`}
              disabled={checked || locked}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === i, disabled: checked || locked }}
              style={[styles.choice, { borderColor: border, backgroundColor: bg }]}>
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {locked && checked && (
        <View style={[styles.feedback, { backgroundColor: stepRight ? colors.successSoft : colors.dangerSoft }]}>
          <Text variant="small">{step.feedback}</Text>
        </View>
      )}
      {inlineAction}
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
