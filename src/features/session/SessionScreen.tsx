import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { WORLD_BY_UNIT } from '@/content';
import { useContent } from '@/content/useContent';
import { boostMinutesLeft } from '@/game';
import { useT } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Icon, NoEnergySheet, ProgressBar, Screen, Text, space, useColors } from '@/ui';

import { ExerciseView } from './ExerciseView';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionEnd } from './SessionEnd';
import { useSession, type SessionSpec } from './useSession';

export function SessionScreen({ spec, title }: { spec: SessionSpec; title: string }) {
  const colors = useColors();
  const t = useT();
  const { SUBJECT_BY_ID, UNIT_BY_ID } = useContent();
  const { state, current, answer, next, ratio, hard } = useSession(spec);
  const boostLeft = useProgress((s) => boostMinutesLeft(s.progress.boost, new Date()));
  const unit = spec.mode === 'unit' ? UNIT_BY_ID.get(spec.unitId) : undefined;
  const world = unit ? WORLD_BY_UNIT.get(unit.id) : undefined;
  const color = world?.color ?? (unit ? (SUBJECT_BY_ID.get(unit.subjectId)?.color ?? colors.primary) : colors.primary);

  const quit = () => confirm(t('session.quit.title'), t('session.quit.body'), () => router.back());

  if (state.phase === 'noEnergy') {
    return (
      <Screen>
        <NoEnergySheet onClose={() => router.back()} />
      </Screen>
    );
  }

  if (state.phase === 'done') {
    return <SessionEnd state={state} spec={spec} color={color} />;
  }

  if (!current) {
    return (
      <Screen>
        <Text variant="h2">{t('session.nothing')}</Text>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const tags = [
    current.retry ? t('session.retry') : null,
    boostLeft > 0 ? t('session.boost', { minutes: boostLeft }) : null,
    state.combo >= 3 ? t('session.combo', { combo: state.combo }) : null,
  ].filter((x): x is string => x !== null);

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12} accessibilityRole="button">
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={ratio} color={color} height={14} />
        </View>
        <Text variant="small" secondary>
          {state.index + 1}/{state.steps.length}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text variant="small" secondary numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {tags.length > 0 && (
          <Text variant="small" style={{ color }}>
            {tags.join(' · ')}
          </Text>
        )}
      </View>
      <ExerciseView
        key={`${current.exercise.key}:${state.index}`}
        exercise={current.exercise}
        hard={hard}
        locked={state.phase === 'feedback'}
        onAnswer={(correct) => {
          void (correct ? haptics.correct() : haptics.wrong());
          sounds.play(correct ? 'correct' : 'wrong');
          answer(correct);
        }}
      />
      {state.phase === 'feedback' && state.feedback && (
        <FeedbackPanel feedback={state.feedback} combo={state.combo} onNext={next} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { flex: 1 },
});
