import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATALOG } from '@/content';
import { useContent } from '@/content/useContent';
import { applyCardReview, applySessionEnd, composeDeckSession, previewIntervals, toDayKey, type Grade } from '@/game';
import { useT, type T } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { useProgress } from '@/store/progress';
import { Button, Card, Icon, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

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

  if (ended) {
    const total = queue.length;
    const reviewed = counts.again + counts.hard + counts.good + counts.easy;
    return (
      <Screen footer={<Button label={t('deck.done.back')} onPress={() => router.back()} />}>
        <View style={styles.hero}>
          <Text style={styles.big}>🃏</Text>
          <Text variant="title">{t('deck.done.title')}</Text>
          <Text variant="body" secondary>
            {t('deck.done.body', { reviewed, total, xp: xp + ended.bonus })}
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
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12} accessibilityRole="button">
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={index / queue.length} color={subject?.color} height={14} />
        </View>
        <Text variant="small" secondary>
          {index + 1}/{queue.length}
        </Text>
      </View>

      <Pressable onPress={() => setFlipped(true)} style={[styles.flash, { backgroundColor: colors.surface, borderColor: subject?.color ?? colors.border }]}>
        <Text variant="small" style={{ color: subject?.color }}>
          {subject?.emoji} {card.topic}
          {cardState === undefined || cardState.phase === 'new' ? ` · ${t('deck.review.new')}` : ''}
        </Text>
        <Text variant="title" style={styles.term}>
          {card.term}
        </Text>
        {flipped ? (
          <View style={styles.back}>
            <Text variant="body">{card.definition}</Text>
            {card.example ? (
              <Text variant="small" secondary>
                {t('common.example', { text: card.example })}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="small" secondary>
            {t('deck.review.tap')}
          </Text>
        )}
      </Pressable>

      {flipped ? (
        <View style={styles.grades}>
          {grades.map((g) => (
            <Pressable
              key={g}
              onPress={() => grade(g)}
              style={[
                styles.grade,
                {
                  backgroundColor: g === 'again' ? colors.dangerSoft : g === 'easy' ? colors.successSoft : colors.surfaceAlt,
                  borderColor: g === 'again' ? colors.danger : g === 'easy' ? colors.success : colors.borderStrong,
                },
              ]}>
              <Text variant="bodyBold">{t(`deck.grade.${g}`)}</Text>
              <Text variant="small" secondary>
                {intervalLabel(t, preview[g])}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Button label={t('deck.review.show')} color={subject?.color} onPress={() => setFlipped(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  flash: { borderWidth: 2, borderRadius: radius.lg, padding: space.xl, gap: space.md, minHeight: 260, justifyContent: 'center' },
  term: { textAlign: 'center' },
  back: { gap: space.sm },
  grades: { flexDirection: 'row', gap: space.sm },
  grade: { flex: 1, borderWidth: 2, borderBottomWidth: 4, borderRadius: radius.md, padding: space.sm, alignItems: 'center', gap: 2 },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
});
