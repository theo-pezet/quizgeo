import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { shuffle, type MatchExercise } from '@/game';
import { Text, radius, space, useColors } from '@/ui';

interface Props {
  exercise: MatchExercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

/** Une erreur tolérée : au-delà, l'exercice compte comme raté (mais on le finit). */
const TOLERATED_MISTAKES = 1;

export function MatchView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rights = useMemo(() => shuffle(exercise.pairs.map((p) => p.right), Math.random), [exercise.key]);
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!locked && done.size === exercise.pairs.length) onAnswer(mistakes <= TOLERATED_MISTAKES);
  }, [done, exercise.pairs.length, locked, mistakes, onAnswer]);

  const pickRight = (right: string) => {
    if (left === null) return;
    if (exercise.pairs[left].right === right) {
      setDone(new Set(done).add(left));
      setLeft(null);
    } else {
      setMistakes((m) => m + 1);
      setFlash(right);
      setTimeout(() => setFlash(null), 350);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt ?? 'Associe les paires'}</Text>
      <View style={styles.cols}>
        <View style={styles.col}>
          {exercise.pairs.map((p, i) => {
            const isDone = done.has(i);
            return (
              <Pressable
                key={p.left}
                disabled={locked || isDone}
                onPress={() => setLeft(i)}
                style={[
                  styles.tile,
                  {
                    borderColor: isDone ? colors.success : left === i ? colors.primary : colors.border,
                    backgroundColor: isDone ? colors.successSoft : colors.surface,
                    opacity: isDone ? 0.6 : 1,
                  },
                ]}>
                <Text variant="small">{p.left}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.col}>
          {rights.map((right) => {
            const isDone = exercise.pairs.some((p, i) => p.right === right && done.has(i));
            return (
              <Pressable
                key={right}
                disabled={locked || isDone || left === null}
                onPress={() => pickRight(right)}
                style={[
                  styles.tile,
                  {
                    borderColor: isDone ? colors.success : flash === right ? colors.danger : colors.border,
                    backgroundColor: isDone ? colors.successSoft : flash === right ? colors.dangerSoft : colors.surface,
                    opacity: isDone ? 0.6 : 1,
                  },
                ]}>
                <Text style={styles.rightText}>{right}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text variant="small" secondary>
        {left === null ? 'Choisis un terme à gauche…' : 'Maintenant sa définition à droite.'}
        {mistakes > 0 ? ` (${mistakes} erreur${mistakes > 1 ? 's' : ''})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  cols: { flexDirection: 'row', gap: space.sm },
  col: { flex: 1, gap: space.sm },
  tile: { borderWidth: 2, borderRadius: radius.md, padding: space.md, minHeight: 64, justifyContent: 'center' },
  rightText: { fontSize: 12, lineHeight: 16 },
});
