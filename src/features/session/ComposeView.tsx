import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { shuffle, type ComposeExercise } from '@/game';
import { useT } from '@/i18n';
import { Text, font, radius, space, useColors } from '@/ui';

import { useSessionAction } from './SessionAction';

interface Props {
  exercise: ComposeExercise;
  onAnswer: (correct: boolean, whyWrong?: string) => void;
  locked: boolean;
}

/**
 * Assembler une ligne de code : on touche les morceaux dans l'ordre, ils
 * rejoignent la ligne ; on retouche un morceau de la ligne pour le renvoyer
 * dans la banque. Les morceaux sont manipulés par index (deux parenthèses
 * identiques restent deux morceaux distincts).
 */
export function ComposeView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  const bank = useMemo(
    () => shuffle([...exercise.tokens, ...exercise.extra], Math.random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise.key],
  );
  const [line, setLine] = useState<number[]>([]);
  const built = line.map((i) => bank[i]);
  const isCorrect = built.length === exercise.tokens.length && built.every((tok, i) => tok === exercise.tokens[i]);
  const joined = (tokens: string[]) => tokens.join(' ');
  const complete = line.length === exercise.tokens.length;
  const inlineAction = useSessionAction(
    locked
      ? null
      : {
          label: t('common.check'),
          disabled: !complete,
          onPress: () => complete && onAnswer(isCorrect, isCorrect ? undefined : t('session.compose.yours', { line: joined(built) })),
        },
  );

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt}</Text>
      <View
        style={[
          styles.slot,
          { backgroundColor: colors.surfaceAlt, borderColor: locked ? (isCorrect ? colors.success : colors.danger) : colors.border },
        ]}>
        <Text style={[styles.lang, { color: colors.textSecondary }]}>{exercise.lang}</Text>
        <View style={styles.row}>
          {line.length === 0 && (
            <Text variant="small" secondary>
              {t('session.compose.hint')}
            </Text>
          )}
          {line.map((bankIndex, pos) => (
            <Pressable
              key={`${bankIndex}-${pos}`}
              disabled={locked}
              onPress={() => setLine(line.filter((_, p) => p !== pos))}
              accessibilityRole="button"
              accessibilityState={{ selected: true, disabled: locked }}
              style={[styles.tok, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[font.mono, { color: colors.text }]}>{bank[bankIndex]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {locked && !isCorrect && (
        <View style={[styles.solution, { backgroundColor: colors.successSoft }]}>
          <Text variant="small" style={{ color: colors.success }}>
            {t('session.compose.solution')}
          </Text>
          <Text style={[font.mono, { color: colors.text }]}>{joined(exercise.tokens)}</Text>
        </View>
      )}
      <View style={styles.row}>
        {bank.map((tok, i) =>
          line.includes(i) ? null : (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => setLine([...line, i])}
              accessibilityRole="button"
              accessibilityState={{ selected: false, disabled: locked }}
              style={[styles.tok, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[font.mono, { color: colors.text }]}>{tok}</Text>
            </Pressable>
          ),
        )}
      </View>
      {inlineAction}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  slot: { borderRadius: radius.md, borderWidth: 2, padding: space.md, gap: space.xs, minHeight: 72 },
  lang: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  tok: { borderWidth: 2, borderBottomWidth: 4, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12 },
  solution: { borderRadius: radius.md, padding: space.md, gap: space.xs },
});
