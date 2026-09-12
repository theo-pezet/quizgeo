import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARDS, CARD_BY_ID, CATALOG, EXERCISES, SUBJECT_BY_ID, cardIdsOf } from '@/content';
import { applyCardReview, applySessionEnd, composeDeckSession, previewIntervals, toDayKey, type Grade } from '@/game';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { useProgress } from '@/store/progress';
import { Button, Card, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

const GRADE_LABEL: Record<Grade, string> = { again: 'Encore', hard: 'Difficile', good: 'Bien', easy: 'Facile' };

function intervalLabel(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days < 30) return `${days} j`;
  return `${Math.round(days / 30)} mois`;
}

export default function DeckReviewRoute() {
  const colors = useColors();
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
    confirm('Arrêter ici ?', `${done} carte${done > 1 ? 's' : ''} révisée${done > 1 ? 's' : ''}. Le reste attendra la prochaine fois.`, () =>
      finish(done, done - counts.again),
    );
  };

  if (ended) {
    const total = queue.length;
    const reviewed = counts.again + counts.hard + counts.good + counts.easy;
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.big}>🃏</Text>
          <Text variant="title">Session terminée</Text>
          <Text variant="body" secondary>
            {reviewed} carte{reviewed > 1 ? 's' : ''} sur {total} · +{xp + ended.bonus} XP
          </Text>
        </View>
        <Card>
          <Text variant="small">Encore : {counts.again} · Difficile : {counts.hard} · Bien : {counts.good} · Facile : {counts.easy}</Text>
          <Text variant="small" secondary>
            {ended.bonus > 0 ? `Bonus de session +${ended.bonus} XP · série : ${ended.streak} jour${ended.streak > 1 ? 's' : ''}` : 'Révise au moins 5 cartes pour le bonus et la série.'}
          </Text>
        </Card>
        <Button label="Retour au deck" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!card || !preview) {
    return (
      <Screen>
        <Text variant="h2">Rien à réviser aujourd’hui 🎉</Text>
        <Text variant="small" secondary>
          Toutes les cartes de ce deck sont planifiées plus tard. Reviens demain, ou fais une leçon.
        </Text>
        <Button label="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  const subject = SUBJECT_BY_ID.get(card.subject);
  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12}>
          <Text variant="h2" secondary>
            ✕
          </Text>
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={index / queue.length} color={subject?.color} />
        </View>
        <Text variant="small" secondary>
          {index + 1}/{queue.length}
        </Text>
      </View>

      <Pressable onPress={() => setFlipped(true)} style={[styles.flash, { backgroundColor: colors.surface, borderColor: subject?.color ?? colors.border }]}>
        <Text variant="small" style={{ color: subject?.color }}>
          {subject?.emoji} {card.topic}
          {cardState === undefined || cardState.phase === 'new' ? ' · nouvelle' : ''}
        </Text>
        <Text variant="title" style={styles.term}>
          {card.term}
        </Text>
        {flipped ? (
          <View style={styles.back}>
            <Text variant="body">{card.definition}</Text>
            {card.example ? (
              <Text variant="small" secondary>
                Ex. : {card.example}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="small" secondary>
            Touche pour voir la réponse
          </Text>
        )}
      </Pressable>

      {flipped ? (
        <View style={styles.grades}>
          {(['again', 'hard', 'good', 'easy'] as Grade[]).map((g) => (
            <Pressable
              key={g}
              onPress={() => grade(g)}
              style={[
                styles.grade,
                {
                  backgroundColor: g === 'again' ? colors.dangerSoft : g === 'easy' ? colors.successSoft : colors.surfaceAlt,
                  borderColor: g === 'again' ? colors.danger : g === 'easy' ? colors.success : colors.border,
                },
              ]}>
              <Text variant="bodyBold">{GRADE_LABEL[g]}</Text>
              <Text variant="small" secondary>
                {intervalLabel(preview[g])}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Button label="Voir la réponse" color={subject?.color} onPress={() => setFlipped(true)} />
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
  grade: { flex: 1, borderWidth: 2, borderRadius: radius.md, padding: space.sm, alignItems: 'center', gap: 2 },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64 },
});
