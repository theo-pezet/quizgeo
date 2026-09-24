import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { CATALOG } from '@/content';
import { useContent } from '@/content/useContent';
import { applyCardReview, applySessionEnd, composeDeckSession, previewIntervals, toDayKey, type Grade } from '@/game';
import { useT, type T } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { useProgress } from '@/store/progress';
import { Button, Card, FadeUp, Icon, ProgressBar, Screen, Text, radius, shade, space, tint, useColors } from '@/ui';

function intervalLabel(t: T, days: number): string {
  if (days === 0) return t('deck.interval.today');
  if (days === 1) return t('deck.interval.tomorrow');
  if (days < 30) return t('deck.interval.days', { count: days });
  return t('deck.interval.months', { count: Math.round(days / 30) });
}

export default function DeckReviewRoute() {
  const colors = useColors();
  const t = useT();
  const { CARDS, CARD_BY_ID, EXERCISES, SUBJECT_BY_ID, cardIdsOf } = useContent();
  const { subjectId } = useLocalSearchParams<{ subjectId?: string }>();
  const startProgress = useRef(useProgress.getState().progress);
  const today = toDayKey(new Date());

  const queue = useMemo(() => {
    const ids = subjectId ? cardIdsOf(subjectId) : CARDS.map((c) => c.id);
    return composeDeckSession(startProgress.current.cards, ids, today, Math.random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [xp, setXp] = useState(0);
  const [ended, setEnded] = useState<{ bonus: number; streak: number } | null>(null);

  const cardId = queue[index];
  const card = cardId ? CARD_BY_ID.get(cardId) : undefined;
  const cardState = useProgress((s) => (cardId ? s.progress.cards[cardId] : undefined));
  const preview = cardId ? previewIntervals(cardState, cardId, today) : null;

  const finish = (done: number, correct: number) => {
    const store = useProgress.getState();
    const result = applySessionEnd(store.progress, {
      mode: 'deck',
      unitId: null,
      questionCount: done,
      correctCount: correct,
      chrono: false,
      now: new Date(),
      questions: EXERCISES,
      catalog: CATALOG,
      progressAtSessionStart: startProgress.current,
    });
    store.setProgress(result.progress);
    setEnded({ bonus: result.xpGained, streak: result.progress.streak.current });
  };

  const grade = (g: Grade) => {
    if (!cardId) return;
    const store = useProgress.getState();
    const r = applyCardReview(store.progress, { cardId, grade: g, now: new Date() });
    store.setProgress(r.progress);
    void (r.correct ? haptics.tap() : haptics.wrong());
    const nextCounts = { ...counts, [g]: counts[g] + 1 };
    setCounts(nextCounts);
    setXp(xp + r.xpGained);
    setFlipped(false);
    if (index + 1 >= queue.length) {
      const done = queue.length;
      finish(done, done - nextCounts.again);
    } else {
      setIndex(index + 1);
    }
  };

  const quit = () => {
    const done = index;
    if (done === 0) {
      router.back();
      return;
    }
    confirm(t('deck.stop.title'), t('deck.stop.body', { count: done }), () => finish(done, done - counts.again));
  };

  // Retour Android en cours de révision : comme la croix (confirmer puis
  // enregistrer la session, pour le bonus et la série).
  const reviewing = !ended && index > 0;
  useFocusEffect(
    useCallback(() => {
      if (!reviewing) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        quit();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reviewing, index, counts]),
  );

  if (ended) {
    const total = queue.length;
    const reviewed = counts.again + counts.hard + counts.good + counts.easy;
    return (
      <Screen footer={<Button label={t('deck.done.back')} onPress={() => router.back()} />}>
        <View style={styles.hero}>
          <Text style={styles.big}>🃏</Text>
          <Text variant="title" style={styles.term}>
            {t('deck.done.title')}
          </Text>
          <Text variant="body" secondary style={styles.term}>
            {t('deck.done.body', { count: reviewed, total, xp: xp + ended.bonus })}
          </Text>
        </View>
        <Card>
          <Text variant="small">{t('deck.done.counts', counts)}</Text>
          <Text variant="small" secondary>
            {ended.bonus > 0 ? t('deck.done.bonus', { bonus: ended.bonus, streak: ended.streak, count: ended.streak }) : t('deck.done.noBonus')}
          </Text>
        </Card>
      </Screen>
    );
  }

  if (!card || !preview) {
    return (
      <Screen footer={<Button label={t('common.back')} onPress={() => router.back()} />}>
        <Text variant="h2">{t('deck.empty.title')}</Text>
        <Text variant="small" secondary>
          {t('deck.empty.body')}
        </Text>
      </Screen>
    );
  }

  const subject = SUBJECT_BY_ID.get(card.subject);
  const accent = subject?.color ?? colors.primary;
  const isNew = cardState === undefined || cardState.phase === 'new';
  const tones = gradeTones(colors);
  const footer = flipped ? (
    <View style={styles.grid}>
      {GRADE_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.gridRow}>
          {row.map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityLabel={`${t(`deck.grade.${g}`)}, ${intervalLabel(t, preview[g])}`}
              onPress={() => grade(g)}
              style={({ pressed }) => [
                styles.grade,
                { backgroundColor: tint(tones[g], 0.88), borderColor: tones[g], borderBottomColor: shade(tones[g]) },
                pressed && styles.pressed,
              ]}>
              <Text variant="bodyBold" numberOfLines={1} style={{ color: shade(tones[g], 0.1) }}>
                {t(`deck.grade.${g}`)}
              </Text>
              <Text variant="small" numberOfLines={1} secondary>
                {intervalLabel(t, preview[g])}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  ) : (
    <Button label={t('deck.review.show')} color={accent} onPress={() => setFlipped(true)} />
  );

  return (
    <Screen footer={footer}>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={index / queue.length} color={accent} height={14} />
        </View>
        <Text variant="small" secondary>
          {index + 1}/{queue.length}
        </Text>
      </View>

      <Pressable
        onPress={() => setFlipped(true)}
        disabled={flipped}
        style={[styles.flash, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomColor: colors.borderStrong }]}>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: tint(accent, 0.88) }]}>
            <Text variant="small" style={[styles.pillText, { color: accent }]}>
              {subject ? `${subject.emoji} ${subject.title}` : card.subject}
            </Text>
          </View>
          {isNew && (
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <Text variant="small" secondary style={styles.pillText}>
                {t('deck.review.new')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.face}>
          <Text variant="title" style={styles.term}>
            {card.term}
          </Text>
          {!flipped && (
            <Text variant="small" secondary style={styles.term}>
              {t('deck.review.tap')}
            </Text>
          )}
        </View>

        {flipped && (
          <FadeUp style={styles.back}>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            <Text variant="body" style={styles.definition}>
              {card.definition}
            </Text>
            {card.example ? (
              <View style={[styles.example, { backgroundColor: colors.surfaceAlt, borderLeftColor: accent }]}>
                <Text variant="small" style={[styles.pillText, { color: accent }]}>
                  {t('deck.review.example')}
                </Text>
                <Text variant={looksLikeCode(card.example) ? 'mono' : 'small'} style={styles.exampleText}>
                  {card.example}
                </Text>
              </View>
            ) : null}
          </FadeUp>
        )}
      </Pressable>
    </Screen>
  );
}

/** Deux rangées, de l'échec à la facilité : gros boutons, libellés entiers. */
const GRADE_ROWS: Grade[][] = [
  ['again', 'hard'],
  ['good', 'easy'],
];

/** Une couleur par note, lisible en clair comme en sombre. */
function gradeTones(colors: ReturnType<typeof useColors>): Record<Grade, string> {
  return { again: colors.danger, hard: '#D97706', good: '#2563EB', easy: colors.success };
}

/** Un exemple qui ressemble à du code s'affiche en police à chasse fixe. */
function looksLikeCode(text: string): boolean {
  return /=>|[{}]|\w\(.*\)|<\/?[a-z]+[ >]|^\s*(def|import|from|const|let|SELECT)\b|\b[a-z_]+\.[a-z_]+\(/i.test(text);
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  flash: { borderWidth: 2, borderBottomWidth: 5, borderRadius: radius.lg, padding: space.lg, gap: space.lg, minHeight: 320 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  pillText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  face: { flexGrow: 1, justifyContent: 'center', gap: space.sm, paddingVertical: space.md },
  term: { textAlign: 'center' },
  back: { gap: space.md },
  rule: { height: 2, borderRadius: 1 },
  definition: { lineHeight: 24 },
  example: { borderLeftWidth: 3, borderRadius: radius.sm, padding: space.md, gap: space.xs },
  exampleText: { lineHeight: 20 },
  grid: { gap: space.sm },
  gridRow: { flexDirection: 'row', gap: space.sm },
  grade: { flex: 1, borderWidth: 2, borderBottomWidth: 5, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.xs, alignItems: 'center', gap: 1 },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
});
