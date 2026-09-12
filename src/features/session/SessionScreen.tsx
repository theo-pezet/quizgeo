import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SUBJECT_BY_ID, UNIT_BY_ID } from '@/content';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { boostMinutesLeft } from '@/game';
import { useProgress } from '@/store/progress';
import { Button, NoEnergySheet, ProgressBar, Screen, Text, space, useColors } from '@/ui';

import { ExerciseView } from './ExerciseView';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionEnd } from './SessionEnd';
import { useSession, type SessionSpec } from './useSession';

export function SessionScreen({ spec, title }: { spec: SessionSpec; title: string }) {
  const colors = useColors();
  const { state, current, answer, next, ratio } = useSession(spec);
  const boostLeft = useProgress((s) => boostMinutesLeft(s.progress.boost, new Date()));
  const unit = spec.mode === 'unit' ? UNIT_BY_ID.get(spec.unitId) : undefined;
  const color = unit ? (SUBJECT_BY_ID.get(unit.subjectId)?.color ?? colors.primary) : colors.primary;

  const quit = () =>
    confirm('Quitter la session ?', 'Tes réponses sont déjà enregistrées, mais cette session ne comptera pas dans ta série.', () =>
      router.back(),
    );

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
        <Text variant="h2">Rien à réviser pour l’instant 🎉</Text>
        <Button label="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12}>
          <Text variant="h2" secondary>
            ✕
          </Text>
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={ratio} color={color} />
        </View>
        <Text variant="small" secondary>
          {state.index + 1}/{state.steps.length}
        </Text>
      </View>
      <Text variant="small" secondary>
        {title}
        {current.retry ? ' · rattrapage' : ''}
        {boostLeft > 0 ? ` · ⚡ XP ×2 (${boostLeft} min)` : ''}
        {state.combo >= 3 ? ` · 🔥 ×${state.combo}` : ''}
      </Text>
      <ExerciseView
        key={`${current.exercise.key}:${state.index}`}
        exercise={current.exercise}
        locked={state.phase === 'feedback'}
        onAnswer={(correct) => {
          void (correct ? haptics.correct() : haptics.wrong());
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
});
