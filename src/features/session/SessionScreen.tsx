import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { state, current, previous, answer, next, ratio, counter, inPretest, hard } = useSession(spec);
  const boostLeft = useProgress((s) => boostMinutesLeft(s.progress.boost, new Date()));
  const unit = spec.mode === 'unit' ? UNIT_BY_ID.get(spec.unitId) : undefined;
  const world = unit ? WORLD_BY_UNIT.get(unit.id) : undefined;
  const color = world?.color ?? (unit ? (SUBJECT_BY_ID.get(unit.subjectId)?.color ?? colors.primary) : colors.primary);

  // Le bouton de la question en cours (« Vérifier »…), rendu dans la barre fixe.
  const [action, setAction] = useState<SessionAction | null>(null);
  // Remonter en haut : à chaque question, et à chaque étape d'un cas pratique.
  const [stepNonce, setStepNonce] = useState(0);
  const actionApi = useMemo(() => ({ setAction, scrollToTop: () => setStepNonce((n) => n + 1) }), []);
  // La question précédente reste montée (cachée) : on la revoit exactement
  // comme on l'a laissée, choix et couleurs compris. Sa vue ne pilote jamais
  // la barre du bas.
  const silentApi = useMemo(() => ({ setAction: () => {}, scrollToTop: () => {} }), []);
  const [peek, setPeek] = useState(false);
  // « Sûr ? » : à dire AVANT de valider (effet d'hypercorrection). Remis à zéro à chaque question.
  const [sure, setSure] = useState(false);
  useEffect(() => {
    setPeek(false);
    setSure(false);
  }, [state.index]);
  const peeking = peek && previous !== null;

  const inSession = state.phase === 'question' || state.phase === 'feedback';
  const quit = useCallback(() => confirm(t('session.quit.title'), t('session.quit.body'), exitSession), [t]);

  // Retour Android : même confirmation que la croix pendant la session.
  useFocusEffect(
    useCallback(() => {
      if (!inSession) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        // Retour pendant la consultation de la question précédente : on revient à la question.
        if (peeking) setPeek(false);
        else quit();
        return true;
      });
      return () => sub.remove();
    }, [inSession, quit, peeking]),
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

  const tags = peeking
    ? [t('session.previous.tag')]
    : inPretest
      ? [t('session.pretest.tag')]
      : [
    current.retry ? t('session.retry') : null,
    boostLeft > 0 ? t('session.boost', { minutes: boostLeft }) : null,
    state.combo >= 3 ? t('session.combo', { combo: state.combo }) : null,
  ].filter((x): x is string => x !== null);

  const verdict = state.phase === 'feedback' ? state.feedback : null;
  const noteTone = !verdict && action?.note ? feedbackTone(colors, action.note.correct) : null;
  const barTone = peeking ? feedbackTone(colors, previous.feedback.correct) : verdict ? feedbackTone(colors, verdict.correct) : noteTone;
  const footer = peeking ? (
    <FeedbackPanel feedback={previous.feedback} combo={0} onNext={() => setPeek(false)} nextLabel={t('session.previous.back')} />
  ) : verdict ? (
    <FeedbackPanel feedback={verdict} combo={state.combo} onNext={next} />
  ) : action ? (
    <View style={styles.actionWrap}>
      {!inPretest && !action.note && (
        <Pressable
          onPress={() => setSure((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: sure }}
          accessibilityHint={t('session.sure.hint')}
          style={[styles.sure, { borderColor: sure ? color : colors.border, backgroundColor: sure ? colors.surfaceAlt : 'transparent' }]}>
          <Icon name={sure ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={sure ? color : colors.textSecondary} />
          <Text variant="small" style={{ color: sure ? color : colors.textSecondary, fontWeight: '700' }}>
            {t('session.sure')}
          </Text>
        </Pressable>
      )}
      <ActionBar action={action} color={color} />
    </View>
  ) : undefined;

  return (
    <SessionActionProvider value={actionApi}>
      <Screen footer={footer} footerBackground={barTone?.background} footerBorder={barTone?.border} scrollKey={`${state.index}:${stepNonce}:${peeking ? 'p' : 'c'}`}>
        <View style={styles.top}>
          <Pressable onPress={quit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Icon name="close" size={26} color={colors.textSecondary} />
          </Pressable>
          {previous && (
            <Pressable
              onPress={() => setPeek((p) => !p)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={peeking ? t('session.previous.back') : t('session.previous')}
              accessibilityState={{ selected: peeking }}
              style={[styles.prev, { borderColor: peeking ? color : colors.border, backgroundColor: peeking ? colors.surfaceAlt : 'transparent' }]}>
              <Icon name="arrow-undo" size={16} color={peeking ? color : colors.textSecondary} />
            </Pressable>
          )}
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
        {previous && (
          <View key={`step-${state.index - 1}`} style={peeking ? undefined : styles.hidden}>
            <SessionActionProvider value={silentApi}>
              <ExerciseView exercise={previous.step.exercise} hard={hard} locked onAnswer={noop} />
            </SessionActionProvider>
          </View>
        )}
        <View key={`step-${state.index}`} style={peeking ? styles.hidden : undefined}>
          <SessionActionProvider value={actionApi}>
            <ExerciseView
              exercise={current.exercise}
              hard={hard}
              locked={state.phase === 'feedback'}
              onAnswer={(correct, whyWrong) => {
                void (correct ? haptics.correct() : haptics.wrong());
                sounds.play(correct ? 'correct' : 'wrong');
                answer(correct, whyWrong, sure);
              }}
            />
          </SessionActionProvider>
        </View>
      </Screen>
    </SessionActionProvider>
  );
}

function noop() {}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  actionWrap: { gap: space.sm },
  sure: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 2, borderRadius: 999, paddingVertical: 4, paddingHorizontal: space.sm },
  prev: { borderWidth: 2, borderRadius: 999, padding: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  big: { fontSize: 56, lineHeight: 68, textAlign: 'center' },
  center: { textAlign: 'center' },
});
