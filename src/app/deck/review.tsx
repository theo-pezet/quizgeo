import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { CATALOG } from '@/content';
import { faceAvailability, faceMaterial } from '@/content/faces';
import { useContent } from '@/content/useContent';
import { useActiveSubjects } from '@/content/useSubjects';
import { applyCardReview, applySessionEnd, composeDeckSession, interleaveBy, pickCardFace, previewIntervals, shouldRelearn, toDayKey, type CardFace, type Grade } from '@/game';
import { useT, type Key, type T } from '@/i18n';
import { looksLikeCode } from '@/lib/code';
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
  const { CARD_BY_ID, EXERCISES, SUBJECT_BY_ID, cardIdsOf } = useContent();
  const active = useActiveSubjects();
  const { subjectId } = useLocalSearchParams<{ subjectId?: string }>();
  const startProgress = useRef(useProgress.getState().progress);
  const today = toDayKey(new Date());

  // Toutes matières : les cartes sont entrelacées par matière (voir src/game/learning.ts).
  const [queue, setQueue] = useState<string[]>(() => {
    // Toutes matières : celles que l'apprenant a choisies.
    const ids = subjectId ? cardIdsOf(subjectId) : active.flatMap((s) => cardIdsOf(s.id));
    const picked = composeDeckSession(startProgress.current.cards, ids, today, Math.random);
    return subjectId ? picked : interleaveBy(picked, (id) => CARD_BY_ID.get(id)?.subject ?? '');
  });
  // « Encore » : la carte revient en fin de séance, jusqu'à être retrouvée (au plus RELEARN_MAX fois).
  const lapses = useRef(new Map<string, number>());
  const lastMark = useRef(Date.now());

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [xp, setXp] = useState(0);
  const [ended, setEnded] = useState<{ bonus: number; streak: number } | null>(null);

  const cardId = queue[index];
  const card = cardId ? CARD_BY_ID.get(cardId) : undefined;
  const cardState = useProgress((s) => (cardId ? s.progress.cards[cardId] : undefined));
  const preview = cardId ? previewIntervals(cardState, cardId, today) : null;
  // Le visage de la carte : tiré une fois par carte (voir src/game/faces.ts).
  const material = useMemo(() => (card ? faceMaterial(card, CARD_BY_ID) : null), [card, CARD_BY_ID]);
  const face: CardFace = useMemo(
    () => (material ? pickCardFace(useProgress.getState().progress.cards[cardId as string], faceAvailability(material), Math.random) : 'term'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardId, index],
  );

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
    const now = new Date();
    const r = applyCardReview(store.progress, { cardId, grade: g, now, face, studySeconds: (now.getTime() - lastMark.current) / 1000, subjectId: CARD_BY_ID.get(cardId)?.subject });
    lastMark.current = now.getTime();
    store.setProgress(r.progress);
    void (r.correct ? haptics.tap() : haptics.wrong());
    const nextCounts = { ...counts, [g]: counts[g] + 1 };
    setCounts(nextCounts);
    setXp(xp + r.xpGained);
    setFlipped(false);
    let nextQueue = queue;
    if (g === 'again') {
      const n = (lapses.current.get(cardId) ?? 0) + 1;
      lapses.current.set(cardId, n);
      if (shouldRelearn(n)) {
        nextQueue = [...queue, cardId];
        setQueue(nextQueue);
      }
    }
    if (index + 1 >= nextQueue.length) {
      const done = nextQueue.length;
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
          {face !== 'term' && (
            <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
              <Text variant="small" secondary style={styles.pillText}>
                {t(`deck.face.pill.${face}` as Key)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.face}>
          {face === 'term' || flipped ? (
            <Text variant="title" style={styles.term}>
              {card.term}
            </Text>
          ) : (
            <FaceFront face={face} material={material} card={card} accent={accent} />
          )}
          {!flipped && (
            <Text variant="small" secondary style={styles.term}>
              {face === 'term' ? t('deck.review.tap') : t('deck.face.think')}
            </Text>
          )}
        </View>

        {flipped && (
          <FadeUp style={styles.back}>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            {face === 'cloze' && material?.cloze && (
              <Text variant="bodyBold" style={{ color: accent }}>
                {t('deck.face.missing', { answer: material.cloze.answer })}
              </Text>
            )}
            <Text variant="body" style={styles.definition}>
              {card.definition}
            </Text>
            {face === 'duel' && material?.duel && (
              <View style={[styles.example, { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.danger }]}>
                <Text variant="small" style={[styles.pillText, { color: colors.danger }]}>
                  {t('deck.face.rival')}
                </Text>
                <Text variant="bodyBold">{material.duel.rival.term}</Text>
                <Text variant="small" style={styles.exampleText}>
                  {material.duel.rival.definition}
                </Text>
              </View>
            )}
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

/**
 * Le recto d'une carte selon son visage : on cherche le terme à partir de la
 * définition, d'un exemple, d'un texte à trou, ou on départage deux jumelles.
 */
function FaceFront({ face, material, card, accent }: { face: CardFace; material: ReturnType<typeof faceMaterial> | null; card: { term: string }; accent: string }) {
  const t = useT();
  const colors = useColors();
  const prompt = <Text variant="small" style={[styles.pillText, styles.term, { color: accent }]}>{t(`deck.face.${face}` as Key)}</Text>;
  if (face === 'definition' && material?.definition) {
    return (
      <>
        {prompt}
        <Text variant="body" style={[styles.definition, styles.term]}>{material.definition}</Text>
      </>
    );
  }
  if (face === 'example' && material?.example) {
    return (
      <>
        {prompt}
        <Text variant={looksLikeCode(material.example) ? 'mono' : 'body'} style={[styles.definition, styles.term]}>{material.example}</Text>
      </>
    );
  }
  if (face === 'cloze' && material?.cloze) {
    return (
      <>
        {prompt}
        <Text variant="h2" style={styles.term}>{card.term}</Text>
        <Text variant="body" style={[styles.definition, styles.term]}>{material.cloze.text}</Text>
      </>
    );
  }
  if (face === 'duel' && material?.duel) {
    return (
      <>
        {prompt}
        <View style={styles.duel}>
          <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="bodyBold">{card.term}</Text>
          </View>
          <Text variant="small" secondary>vs</Text>
          <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="bodyBold">{material.duel.rival.term}</Text>
          </View>
        </View>
        <Text variant="body" style={[styles.definition, styles.term]}>{material.duel.definition}</Text>
      </>
    );
  }
  return (
    <Text variant="title" style={styles.term}>
      {card.term}
    </Text>
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

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  flash: { borderWidth: 2, borderBottomWidth: 5, borderRadius: radius.lg, padding: space.lg, gap: space.lg, minHeight: 320 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pill: { borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  pillText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  face: { flexGrow: 1, justifyContent: 'center', gap: space.sm, paddingVertical: space.md },
  term: { textAlign: 'center' },
  duel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: space.sm },
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
