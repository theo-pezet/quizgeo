import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BugLineExercise } from '@/game';
import { useT } from '@/i18n';
import { Button, Text, font, radius, space, useColors } from '@/ui';

interface Props {
  exercise: BugLineExercise;
  onAnswer: (correct: boolean, whyWrong?: string) => void;
  locked: boolean;
}

/** Repérer la ligne fautive : on touche une ligne, puis on vérifie. */
export function BugLineView({ exercise, onAnswer, locked }: Props) {
  const colors = useColors();
  const t = useT();
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={styles.wrap}>
      <Text variant="h2">{exercise.prompt}</Text>
      <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[styles.lang, { color: colors.textSecondary }]}>{exercise.lang}</Text>
        {exercise.lines.map((line, i) => {
          const isSelected = selected === i;
          let bg = 'transparent';
          let border = 'transparent';
          if (locked && i === exercise.answer) {
            bg = colors.successSoft;
            border = colors.success;
          } else if (locked && isSelected) {
            bg = colors.dangerSoft;
            border = colors.danger;
          } else if (isSelected) {
            bg = colors.surface;
            border = colors.primary;
          }
          return (
            <Pressable
              key={i}
              disabled={locked}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              style={[styles.line, { backgroundColor: bg, borderColor: border }]}>
              <Text style={[styles.num, { color: colors.textSecondary }]}>{i + 1}</Text>
              <Text style={[font.mono, styles.code, { color: colors.text }]}>{line}</Text>
            </Pressable>
          );
        })}
      </View>
      {!locked && (
        <Button
          label={t('common.check')}
          disabled={selected === null}
          onPress={() => {
            const ok = selected === exercise.answer;
            onAnswer(ok, ok ? undefined : t('session.bugline.wrong'));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  box: { borderRadius: radius.md, borderWidth: 1, padding: space.sm, gap: 2 },
  lang: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: space.xs, marginBottom: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 2, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: space.sm },
  num: { width: 18, fontSize: 12, textAlign: 'right' },
  code: { flex: 1 },
});
