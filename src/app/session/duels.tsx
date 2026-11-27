import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { duelsFor } from '@/content/duels';
import { useContent } from '@/content/useContent';
import { applyDuel, countGuided, creditStudy, guidedLeft, toDayKey } from '@/game';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, FadeUp, Icon, ProgressBar, Screen, Text, radius, space, tint, useColors } from '@/ui';

/**
 * Les duels : deux notions que l'apprenant confond, un indice, un choix,
 * puis les deux définitions côte à côte (voir src/game/duels.ts).
 */
export default function DuelsRoute() {
  const colors = useColors();
  const t = useT();
  const { CARD_BY_ID, SUBJECT_BY_ID } = useContent();
  const today = toDayKey(new Date());
  const items = useMemo(() => {
    const p = useProgress.getState().progress;
    return duelsFor(p, CARD_BY_ID, today, guidedLeft(p, today).duels, Math.random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Les deux termes, dans un ordre tiré une fois par duel.
  const orders = useMemo(() => items.map(() => Math.random() < 0.5), [items]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const lastMark = useRef(Date.now());

  const item = items[index];

  if (!item) {
    const done = index > 0;
    return (
      <Screen footer={<Button label={t('common.back')} onPress={() => router.back()} />}>
        <View style={styles.center}>
          <Text style={styles.big}>{done ? '🥊' : '🌿'}</Text>
          <Text variant="h2" style={styles.centerText}>
            {done ? t('duels.done', { score, total: items.length }) : t('duels.none')}
          </Text>
          <Text secondary style={styles.centerText}>
            {done ? t('duels.done.body') : t('duels.none.body')}
          </Text>
        </View>
      </Screen>
    );
  }

  const subject = SUBJECT_BY_ID.get(item.target.subject);
  const accent = subject?.color ?? colors.primary;
  const options = orders[index] ? [item.target, item.other] : [item.other, item.target];
  const answered = picked !== null;
  const correct = picked === item.target.id;

  const choose = (id: string) => {
    if (answered) return;
    const ok = id === item.target.id;
    const now = new Date();
    const store = useProgress.getState();
    let p = applyDuel(store.progress, item.target.id, item.other.id, ok, today);
    p = countGuided(p, 'duels', 1, today);
    p = creditStudy(p, item.target.subject, (now.getTime() - lastMark.current) / 1000, today).progress;
    lastMark.current = now.getTime();
    store.setProgress(p);
    void (ok ? haptics.correct() : haptics.wrong());
    sounds.play(ok ? 'correct' : 'wrong');
    if (ok) setScore(score + 1);
    setPicked(id);
  };

  const next = () => {
    setPicked(null);
    setIndex(index + 1);
  };

  return (
    <Screen footer={answered ? <Button label={t('common.continue')} color={accent} onPress={next} /> : undefined}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={index / items.length} color={accent} height={14} />
        </View>
        <Text variant="small" secondary>
          {index + 1}/{items.length}
        </Text>
      </View>

      <Text variant="small" style={{ color: accent }}>
        {t('duels.tag')}
      </Text>
      <Text variant="h2">{t(item.source === 'example' ? 'duels.prompt.example' : 'duels.prompt.definition')}</Text>
      <View style={[styles.clue, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text>{item.clue}</Text>
      </View>

      <View style={styles.options}>
        {options.map((card) => {
          let border = colors.border;
          let bg = colors.surface;
          if (answered && card.id === item.target.id) {
            border = colors.success;
            bg = colors.successSoft;
          } else if (answered && card.id === picked) {
            border = colors.danger;
            bg = colors.dangerSoft;
          }
          return (
            <Pressable
              key={card.id}
              disabled={answered}
              onPress={() => choose(card.id)}
              accessibilityRole="button"
              style={[styles.option, { borderColor: border, backgroundColor: bg }]}>
              <Text variant="bodyBold" style={styles.centerText}>
                {card.term}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {answered && (
        <FadeUp style={styles.compare}>
          <Text variant="bodyBold" style={{ color: correct ? colors.success : colors.danger }}>
            {correct ? t('duels.right') : t('duels.wrong')}
          </Text>
          {[item.target, item.other].map((card) => (
            <View key={card.id} style={[styles.side, { backgroundColor: tint(card.id === item.target.id ? colors.success : accent, 0.92), borderLeftColor: card.id === item.target.id ? colors.success : accent }]}>
              <Text variant="bodyBold">{card.term}</Text>
              <Text variant="small">{card.definition}</Text>
              {card.example ? (
                <Text variant="small" secondary>
                  {t('duels.example', { example: card.example })}
                </Text>
              ) : null}
            </View>
          ))}
        </FadeUp>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  clue: { borderWidth: 2, borderRadius: radius.md, padding: space.lg },
  options: { flexDirection: 'row', gap: space.sm },
  option: { flex: 1, borderWidth: 2, borderRadius: radius.md, padding: space.md, minHeight: 64, justifyContent: 'center' },
  compare: { gap: space.sm },
  side: { borderLeftWidth: 4, borderRadius: radius.sm, padding: space.md, gap: space.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingTop: space.xl },
  centerText: { textAlign: 'center' },
  big: { fontSize: 56 },
});
