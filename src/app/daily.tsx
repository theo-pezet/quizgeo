import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { CATALOG } from '@/content';
import { duelsFor } from '@/content/duels';
import { useContent } from '@/content/useContent';
import { useActiveSubjects } from '@/content/useSubjects';
import {
  BREAK_SECONDS,
  DAILY_DECK_CAP,
  DAILY_DUEL_CAP,
  DAILY_NEW_CARDS,
  DAILY_REVIEW_CAP,
  STUDY_PLAN_WEIGHTS,
  allUnitTraits,
  composeDeckSession,
  guidedLeft,
  guidedToday,
  guidedUnit,
  nextGuidedBlock,
  pickLessonSubject,
  reviewQueueSize,
  studyTarget,
  toDayKey,
  type GuidedBlock,
} from '@/game';
import { useT } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Button, Card, Icon, ProgressBar, Screen, Text, space, useColors } from '@/ui';

/**
 * La séance guidée : l'appli enchaîne deck, erreurs, duels puis leçons
 * jusqu'à l'objectif du jour, avec une pause entre deux blocs (voir
 * src/game/guided.ts). Elle ne dépend pas de l'heure : on l'ouvre quand on
 * veut, on s'arrête après n'importe quel bloc, on reprend au suivant.
 */
export default function DailyRoute() {
  const colors = useColors();
  const t = useT();
  const { CARD_BY_ID, EXERCISES, EXERCISE_BY_KEY, UNIT_BY_ID, SUBJECT_BY_ID, cardIdsOf } = useContent();
  const subjects = useActiveSubjects();
  const progress = useProgress((s) => s.progress);
  const tick = useProgress((s) => s.tick);
  const now = new Date();
  const today = toDayKey(now);

  // Pause : lancée au retour d'un bloc, jamais à l'ouverture. Elle se règle
  // sur l'heure de fin, pas sur un décompte : téléphone en veille, la minute
  // continue de s'écouler, et elle est finie au réveil si elle devait l'être.
  const launched = useRef(false);
  const [breakEnd, setBreakEnd] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now());
  useFocusEffect(
    useCallback(() => {
      tick();
      if (launched.current) {
        launched.current = false;
        setBreakEnd(Date.now() + BREAK_SECONDS * 1000);
        setClock(Date.now());
      }
    }, [tick]),
  );
  const breakLeft = breakEnd === null ? 0 : Math.max(0, Math.ceil((breakEnd - clock) / 1000));
  useEffect(() => {
    if (breakLeft <= 0) return undefined;
    const timer = setTimeout(() => setClock(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [breakLeft, clock]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setClock(Date.now());
    });
    return () => sub.remove();
  }, []);

  const g = guidedToday(progress.guided, today);
  const left = guidedLeft(progress, today);
  const studyDay = progress.study.day === today;
  const doneMinutes = studyDay ? Math.floor(progress.study.seconds / 60) : 0;
  const target = studyTarget(progress.study);
  const goalMet = progress.study.metOn === today;

  const block: GuidedBlock & { unitId?: string } = useMemo(() => {
    const ids = subjects.flatMap((s) => cardIdsOf(s.id));
    const deckAvailable = composeDeckSession(progress.cards, ids, today, Math.random, { limit: left.deck, newLimit: Math.min(DAILY_NEW_CARDS, left.deck) }).length;
    const traits = allUnitTraits(progress, EXERCISES, CATALOG, today);
    const unitOf = new Map<string, string>();
    for (const s of subjects) {
      const unit = guidedUnit(s.id, traits, CATALOG, g.units ?? []);
      if (unit && UNIT_BY_ID.has(unit)) unitOf.set(s.id, unit);
    }
    const lessonSubject = pickLessonSubject(g.lessonCounts, [...unitOf.keys()], STUDY_PLAN_WEIGHTS);
    const next = nextGuidedBlock({
      left,
      deckAvailable,
      reviewAvailable: reviewQueueSize(progress, EXERCISE_BY_KEY, today),
      duelsAvailable: duelsFor(progress, CARD_BY_ID, today, left.duels, Math.random).length,
      lessonSubject,
      goalMet,
    });
    return next.kind === 'lesson' ? { ...next, unitId: unitOf.get(next.subjectId) } : next;
    // Recalculé quand la progression change (retour d'un bloc).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, today, subjects]);

  const start = () => {
    launched.current = true;
    switch (block.kind) {
      case 'deck':
        router.push('/deck/review');
        return;
      case 'review':
        router.push('/session/review');
        return;
      case 'duels':
        router.push('/session/duels');
        return;
      case 'lesson':
        if (block.unitId) router.push({ pathname: '/session/[unitId]', params: { unitId: block.unitId } });
        return;
      case 'done':
        return;
    }
  };

  const subject = block.kind === 'lesson' ? SUBJECT_BY_ID.get(block.subjectId) : undefined;
  const unit = block.kind === 'lesson' && block.unitId ? UNIT_BY_ID.get(block.unitId) : undefined;
  const title =
    block.kind === 'deck' ? t('guided.block.deck', { count: block.size })
    : block.kind === 'review' ? t('guided.block.review', { count: block.size })
    : block.kind === 'duels' ? t('guided.block.duels', { count: block.size })
    : block.kind === 'lesson' ? t(block.extra ? 'guided.block.extra' : 'guided.block.lesson', { subject: subject ? `${subject.emoji} ${subject.title}` : block.subjectId })
    : t('guided.block.done');
  const body =
    block.kind === 'deck' ? t('guided.block.deck.body')
    : block.kind === 'review' ? t('guided.block.review.body')
    : block.kind === 'duels' ? t('guided.block.duels.body')
    : block.kind === 'lesson' ? (unit?.title ?? '')
    : t('guided.block.done.body');
  const resting = breakLeft > 0;
  const minutes = Math.floor(breakLeft / 60);
  const seconds = String(breakLeft % 60).padStart(2, '0');

  const footer = (
    <View style={styles.footer}>
      {block.kind !== 'done' && (
        <Button
          label={resting ? t('guided.break.wait', { time: `${minutes}:${seconds}` }) : g.deck + g.review + g.duels + g.lessons === 0 ? t('guided.start') : t('guided.next')}
          disabled={resting}
          onPress={start}
        />
      )}
      <Button label={t('guided.stop')} tone="secondary" onPress={() => router.back()} />
    </View>
  );

  return (
    <Screen footer={footer}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Text variant="title">{t('guided.title')}</Text>
      </View>

      <Card>
        <Text variant="bodyBold">{goalMet ? t('guided.goal.met') : t('guided.goal', { done: doneMinutes, target })}</Text>
        <ProgressBar ratio={Math.min(1, doneMinutes / Math.max(1, target))} color={goalMet ? colors.success : colors.primary} height={12} />
        <Text variant="small" secondary>
          {t('guided.counts', { deck: g.deck, deckCap: DAILY_DECK_CAP, review: g.review, reviewCap: DAILY_REVIEW_CAP, duels: g.duels, duelCap: DAILY_DUEL_CAP, lessons: g.lessons })}
        </Text>
      </Card>

      {resting && (
        <Card>
          <Text variant="h2">{t('guided.break.title', { time: `${minutes}:${seconds}` })}</Text>
          <Text secondary>{t('guided.break.body')}</Text>
        </Card>
      )}

      <Card>
        <Text variant="small" secondary>
          {t('guided.upnext')}
        </Text>
        <Text variant="h2">{title}</Text>
        {body !== '' && <Text secondary>{body}</Text>}
      </Card>

      <Text variant="small" secondary>
        {t('guided.rules')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { gap: space.sm },
});
