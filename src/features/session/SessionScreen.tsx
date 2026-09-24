import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

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
import { exitSession } from './exit';
import { FeedbackPanel, feedbackTone } from './FeedbackPanel';
import { ActionBar, SessionActionProvider, type SessionAction } from './SessionAction';
import { SessionEnd } from './SessionEnd';
import { useSession, type SessionSpec } from './useSession';

export function SessionScreen({ spec, title }: { spec: SessionSpec; title: string }) {
  const colors = useColors();
  const t = useT();
  const { SUBJECT_BY_ID, UNIT_BY_ID } = useContent();
  const { state, current, answer, next, ratio, counter, hard } = useSession(spec);
  const boostLeft = useProgress((s) => boostMinutesLeft(s.progress.boost, new Date()));
  const unit = spec.mode === 'unit' ? UNIT_BY_ID.get(spec.unitId) : undefined;
  const world = unit ? WORLD_BY_UNIT.get(unit.id) : undefined;
  const color = world?.color ?? (unit ? (SUBJECT_BY_ID.get(unit.subjectId)?.color ?? colors.primary) : colors.primary);

  // Le bouton de la question en cours (« Vérifier »…), rendu dans la barre fixe.
  const [action, setAction] = useState<SessionAction | null>(null);
  // Remonter en haut : à chaque question, et à chaque étape d'un cas pratique.
  const [stepNonce, setStepNonce] = useState(0);
  const actionApi = useMemo(() => ({ setAction, scrollToTop: () => setStepNonce((n) => n + 1) }), []);

  const inSession = state.phase === 'question' || state.phase === 'feedback';
  const quit = useCallback(() => confirm(t('session.quit.title'), t('session.quit.body'), exitSession), [t]);

  // Retour Android : même confirmation que la croix pendant la session.
  useFocusEffect(
    useCallback(() => {
      if (!inSession) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        quit();
        return true;
      });
      return () => sub.remove();
    }, [inSession, quit]),
  );

  if (state.phase === 'noEnergy') {
    return (
      <Screen>
        <NoEnergySheet onClose={exitSession} />
      </Screen>
    );
  }

  if (state.phase === 'done') {
    return <SessionEnd state={state} spec={spec} color={color} />;
  }

  if (state.phase === 'empty' || !current) {
    return (
      <Screen footer={<Button label={t('common.back')} color={color} onPress={exitSession} />}>
        <View style={styles.empty}>
          <Text style={styles.big}>🌿</Text>
          <Text variant="h2" style={styles.center}>
            {t('session.nothing')}
          </Text>
        </View>
      </Screen>
    );
  }

  const tags = [
    current.retry ? t('session.retry') : null,
    boostLeft > 0 ? t('session.boost', { minutes: boostLeft }) : null,
    state.combo >= 3 ? t('session.combo', { combo: state.combo }) : null,
  ].filter((x): x is string => x !== null);

  const verdict = state.phase === 'feedback' ? state.feedback : null;
  const noteTone = !verdict && action?.note ? feedbackTone(colors, action.note.correct) : null;
  const barTone = verdict ? feedbackTone(colors, verdict.correct) : noteTone;
  const footer = verdict ? (
    <FeedbackPanel feedback={verdict} combo={state.combo} onNext={next} />
  ) : action ? (
    <ActionBar action={action} color={color} />
  ) : undefined;

  return (
    <SessionActionProvider value={actionApi}>
      <Screen footer={footer} footerBackground={barTone?.background} footerBorder={barTone?.border} scrollKey={`${state.index}:${stepNonce}`}>
        <View style={styles.top}>
          <Pressable onPress={quit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Icon name="close" size={26} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.bar}>
            <ProgressBar ratio={ratio} color={color} height={14} />
          </View>
          <Text variant="small" secondary>
            {counter.index}/{counter.total}
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
          onAnswer={(correct, whyWrong) => {
            void (correct ? haptics.correct() : haptics.wrong());
            sounds.play(correct ? 'correct' : 'wrong');
            answer(correct, whyWrong);
          }}
        />
      </Screen>
    </SessionActionProvider>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  big: { fontSize: 56, lineHeight: 68, textAlign: 'center' },
  center: { textAlign: 'center' },
});
