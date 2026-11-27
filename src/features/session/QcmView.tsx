import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { choicesDelayMs, presentQcm, type QcmExercise } from '@/game';
import { useT } from '@/i18n';
import { CodeBlock, Text, radius, space, useColors } from '@/ui';

import { isCodeChoice } from './present';
import { useSessionAction } from './SessionAction';

interface Props {
  exercise: QcmExercise;
  onAnswer: (correct: boolean, whyWrong?: string, given?: string) => void;
  locked: boolean;
  /** Libellé du bouton (par défaut « Vérifier »). Le test de niveau met « Suivant ». */
  checkLabel?: string;
  /**
   * Leçons et révisions : les choix n'apparaissent qu'après le temps de lire
   * la question (voir choicesDelayMs), pour qu'on ne réponde plus à la forme
   * de la bonne réponse sans avoir lu.
   */
  readDelay?: boolean;
  /** Unité déjà acquise : un temps de plus pour retrouver la réponse avant de voir les choix. */
  think?: boolean;
}

export function QcmView({ exercise, onAnswer, locked, checkLabel, readDelay = false, think = false }: Props) {
  const colors = useColors();
  const t = useT();
  // Mélangé à chaque affichage, y compris entre deux apparitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presented = useMemo(() => presentQcm(exercise, Math.random), [exercise.key]);
  const [selected, setSelected] = useState<number | null>(null);
  const isTrueFalse = presented.choices.length === 2;

  const delay = readDelay ? choicesDelayMs(exercise.prompt, exercise.code?.src, think) : 0;
  const [shown, setShown] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return undefined;
    setShown(false);
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.key, delay]);
  const visible = shown || locked;
  const inlineAction = useSessionAction(
    locked || !visible
      ? null
      : {
          label: checkLabel ?? t('common.check'),
          disabled: selected === null,
          onPress: () => {
            if (selected === null) return;
            const ok = selected === presented.answer;
            const original = presented.order[selected];
            onAnswer(ok, ok ? undefined : exercise.whyWrong?.[original] ?? undefined, presented.choices[selected]);
          },
        },
  );

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt}</Text>
      {exercise.code && <CodeBlock code={exercise.code} output={locked ? exercise.output : undefined} />}
      {!visible && (
        <View style={[styles.waiting, { borderColor: colors.border }]}>
          <Text variant="small" secondary>
            {t(think ? 'session.read.think' : 'session.read.wait')}
          </Text>
        </View>
      )}
      {visible && (
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
          const mono = isCodeChoice(exercise.key, choice, presented.choices.length);
          return (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: locked }}
              style={[styles.choice, { borderColor: border, backgroundColor: bg }, isTrueFalse && styles.half]}>
              <Text variant={mono ? 'mono' : 'body'} style={mono ? undefined : styles.choiceText}>
                {choice}
              </Text>
            </Pressable>
          );
        })}
      </View>
      )}
      {visible && inlineAction}
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
  waiting: { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.md, padding: space.lg, alignItems: 'center' },
});
