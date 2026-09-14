import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATALOG, WORLD_BY_UNIT } from '@/content';
import { useContent } from '@/content/useContent';
import { QcmView } from '@/features/session/QcmView';
import { applyPlacement, pickPlacementQuestions, placementSkip, type QcmExercise } from '@/game';
import { useLang, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useProgress, useSettings } from '@/store/progress';
import { Button, Icon, ProgressBar, Screen, Text, radius, space, tint, useColors } from '@/ui';

type Phase = 'intro' | 'questions' | 'self' | 'result';

/**
 * Le test de niveau d'une matière : intro, dix QCM sans correction, une
 * auto-évaluation, puis le placement. Enchaîne sur la matière suivante si
 * l'onboarding en a mis plusieurs dans la file (`queue`).
 */
export default function PlacementRoute() {
  const colors = useColors();
  const t = useT();
  const lang = useLang();
  const { SUBJECT_BY_ID, UNITS, UNIT_BY_ID, EXERCISES, exercisesOfSubject } = useContent();
  const { subjectId, queue } = useLocalSearchParams<{ subjectId: string; queue?: string }>();
  const subject = SUBJECT_BY_ID.get(subjectId ?? '');
  const color = subject?.color ?? colors.primary;
  const unitIds = useMemo(() => UNITS.filter((u) => u.subjectId === subjectId).map((u) => u.id), [UNITS, subjectId]);
  const questions = useMemo(
    () => pickPlacementQuestions(exercisesOfSubject(subjectId ?? ''), unitIds, Math.random),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjectId],
  );

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [self, setSelf] = useState<number | null>(null);

  const next = () => {
    const rest = (queue ?? '').split(',').filter((x) => x !== '');
    if (rest.length > 0) {
      router.replace({ pathname: '/placement/[subjectId]', params: { subjectId: rest[0], queue: rest.slice(1).join(',') } });
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (!subject) {
    return (
      <Screen footer={<Button label={t('common.back')} onPress={next} />}>
        <Text variant="h2">{t('session.title.default')}</Text>
      </Screen>
    );
  }

  const skip = placementSkip(score, questions.length, self ?? 5, unitIds.length);
  const firstUnit = unitIds[skip];
  const world = firstUnit ? WORLD_BY_UNIT.get(firstUnit) : undefined;

  const apply = () => {
    const store = useProgress.getState();
    const { progress } = applyPlacement(store.progress, subject.id, skip, EXERCISES, CATALOG, new Date());
    store.setProgress(progress);
    useSettings.getState().setPlacement(subject.id, { score, total: questions.length, self: self ?? 5, skip, at: new Date().toISOString() });
    useSettings.getState().setFavoriteSubject(subject.id);
    next();
  };

  if (phase === 'intro' || questions.length === 0) {
    return (
      <Screen
        footer={
          <View style={styles.footer}>
            <Button label={t('placement.intro.skip')} tone="ghost" onPress={next} />
            <Button label={t('placement.intro.start')} color={color} style={styles.grow} disabled={questions.length === 0} onPress={() => setPhase('questions')} />
          </View>
        }>
        <View style={styles.hero}>
          <View style={[styles.halo, { backgroundColor: tint(color, 0.85) }]}>
            <Text style={styles.big}>{subject.emoji}</Text>
          </View>
          <Text variant="title" style={styles.center}>
            {t('placement.intro.title', { subject: subject.title })}
          </Text>
          <Text variant="body" secondary style={styles.center}>
            {t('placement.intro.body')}
          </Text>
        </View>
      </Screen>
    );
  }

  if (phase === 'questions') {
    const q: QcmExercise = questions[index];
    return (
      <Screen>
        <View style={styles.top}>
          <Pressable onPress={next} hitSlop={12} accessibilityRole="button">
            <Icon name="close" size={26} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.grow}>
            <ProgressBar ratio={index / questions.length} color={color} height={14} />
          </View>
          <Text variant="small" secondary>
            {index + 1}/{questions.length}
          </Text>
        </View>
        <Text variant="small" secondary>
          {t('placement.question', { index: index + 1, total: questions.length })} · {UNIT_BY_ID.get(q.unitId)?.title ?? ''}
        </Text>
        <QcmView
          key={q.key}
          exercise={q}
          locked={false}
          onAnswer={(correct) => {
            void haptics.tap();
            if (correct) setScore((s) => s + 1);
            if (index + 1 >= questions.length) setPhase('self');
            else setIndex(index + 1);
          }}
        />
      </Screen>
    );
  }

  if (phase === 'self') {
    return (
      <Screen footer={<Button label={t('common.continue')} color={color} disabled={self === null} onPress={() => setPhase('result')} />}>
        <View style={styles.hero}>
          <Text style={styles.big}>🤔</Text>
          <Text variant="title" style={styles.center}>
            {t('placement.self.title')}
          </Text>
          <Text variant="body" secondary style={styles.center}>
            {t('placement.self.body', { subject: subject.title })}
          </Text>
        </View>
        <View style={styles.scale}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              onPress={() => setSelf(n)}
              style={[styles.scaleItem, { backgroundColor: self === n ? color : colors.surface, borderColor: self === n ? color : colors.border }]}>
              <Text variant="bodyBold" style={{ color: self === n ? '#fff' : colors.text }}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.scaleLabels}>
          <Text variant="small" secondary>
            {t('placement.self.low')}
          </Text>
          <Text variant="small" secondary>
            {t('placement.self.high')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label={t('placement.result.replay')} tone="ghost" onPress={() => { setIndex(0); setScore(0); setSelf(null); setPhase('questions'); }} />
          <Button label={t('placement.result.apply')} color={color} style={styles.grow} onPress={apply} />
        </View>
      }>
      <View style={styles.hero}>
        <View style={[styles.halo, { backgroundColor: tint(color, 0.85) }]}>
          <Text style={styles.big}>{skip > 0 ? '🚀' : '🌱'}</Text>
        </View>
        <Text variant="title" style={styles.center}>
          {t('placement.result.title', { score, total: questions.length })}
        </Text>
        <Text variant="body" secondary style={styles.center}>
          {skip > 0 && world ? t('placement.result.skip', { count: skip, world: world.title[lang] }) : t('placement.result.none')}
        </Text>
        {skip > 0 && (
          <View style={[styles.list, { backgroundColor: colors.surfaceAlt }]}>
            {unitIds.slice(0, skip).map((id) => (
              <View key={id} style={styles.listRow}>
                <Icon name="checkmark-circle" size={16} color={colors.success} />
                <Text variant="small">{UNIT_BY_ID.get(id)?.title ?? id}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  footer: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  halo: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 56, lineHeight: 68, textAlign: 'center' },
  center: { textAlign: 'center' },
  scale: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  scaleItem: { width: 52, height: 52, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  list: { width: '100%', borderRadius: radius.md, padding: space.md, gap: space.xs },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
