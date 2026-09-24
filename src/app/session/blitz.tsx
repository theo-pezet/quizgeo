import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { CATALOG } from '@/content';
import { useContent } from '@/content/useContent';
import {
  applyAnswerAction,
  applyBlitzResult,
  applySessionEnd,
  applyStartLesson,
  composeFreeSession,
  presentQcm,
  type Progress,
  type QcmExercise,
} from '@/game';
import { exitSession } from '@/features/session/exit';
import { isCodeChoice } from '@/features/session/present';
import { useT } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Card, Icon, NoEnergySheet, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

const BLITZ_SECONDS = 60;
const POOL = 60;

/**
 * Blitz : 60 secondes, des QCM sans explication, XP doublés (chrono).
 * Compte comme une session libre : coûte 5 ⚡ au lancement et rien de plus
 * (les erreurs ne coûtent pas d'énergie), nourrit la série à partir de
 * 5 réponses.
 */
export default function BlitzRoute() {
  const colors = useColors();
  const t = useT();
  const { SUBJECT_BY_ID, EXERCISES, exercisesOfSubject } = useContent();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const subject = SUBJECT_BY_ID.get(subjectId ?? '');
  const color = subject?.color ?? colors.primary;

  const init = useMemo(() => {
    const store = useProgress.getState();
    // La file d'abord : sans questions, rien n'est prélevé.
    const pool = exercisesOfSubject(subjectId ?? '').filter((e): e is QcmExercise => e.kind === 'qcm' && e.choices.length > 2);
    const queue = composeFreeSession(pool, Math.random, POOL) as QcmExercise[];
    if (queue.length === 0) return { started: true, queue, startProgress: store.progress };
    const started = applyStartLesson(store.progress, 'free', new Date());
    if (started === null) return { started: false, queue: [] as QcmExercise[], startProgress: store.progress };
    store.setProgress(started);
    return { started: true, queue, startProgress: started };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startProgress = useRef<Progress>(init.startProgress);
  const credited = useRef(new Set<string>());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [flash, setFlash] = useState<'ok' | 'ko' | null>(null);
  const [ended, setEnded] = useState<{ xp: number; isBest: boolean; best: number; answered: number } | null>(null);
  const [running, setRunning] = useState(init.started && init.queue.length > 0);
  // Comptes synchrones : une réponse donnée juste avant la fin compte
  // pareil pour le score, le nombre de questions et la série.
  const answeredRef = useRef(0);
  const correctRef = useRef(0);
  const finished = useRef(false);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (nextTimer.current) clearTimeout(nextTimer.current);
    },
    [],
  );

  const exercise = init.queue[index];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presented = useMemo(() => (exercise ? presentQcm(exercise, Math.random) : null), [exercise?.key]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && (left <= 0 || index >= init.queue.length)) finish(left <= 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, index, running]);

  const finish = (timeUp: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setRunning(false);
    if (nextTimer.current) clearTimeout(nextTimer.current);
    setFlash(null);
    if (timeUp) sounds.play('timeup');
    const store = useProgress.getState();
    const answered = answeredRef.current;
    const good = correctRef.current;
    setCorrect(good);
    // Aucune réponse : pas de session enregistrée (ni compteurs, ni badges).
    if (answered === 0) {
      setEnded({ xp: 0, isBest: false, best: store.progress.blitz[subjectId ?? ''] ?? 0, answered });
      return;
    }
    const result = applySessionEnd(store.progress, {
      mode: 'free',
      unitId: null,
      questionCount: answered,
      correctCount: good,
      chrono: true,
      now: new Date(),
      questions: EXERCISES,
      catalog: CATALOG,
      progressAtSessionStart: startProgress.current,
    });
    const blitz = applyBlitzResult(result.progress, subjectId ?? '', good);
    store.setProgress(blitz.progress);
    setEnded({ xp: result.progress.xp - startProgress.current.xp, isBest: blitz.isBest, best: blitz.progress.blitz[subjectId ?? ''] ?? 0, answered });
  };

  /** La croix ou le retour Android : confirmer, puis finir avec le score actuel. */
  const quit = () => {
    confirm(t('blitz.quit.title'), t('blitz.quit.body'), () => {
      if (answeredRef.current === 0) {
        finished.current = true;
        setRunning(false);
        exitSession();
      } else {
        finish(false);
      }
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (!running) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        quit();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [running]),
  );

  const answer = (i: number) => {
    if (!presented || !running || flash || finished.current) return;
    const ok = i === presented.answer;
    const store = useProgress.getState();
    const r = applyAnswerAction(store.progress, {
      question: presented.exercise,
      correct: ok,
      mode: 'free',
      chrono: true,
      now: new Date(),
      creditedThisSession: credited.current.has(presented.exercise.key),
    });
    if (ok) credited.current.add(presented.exercise.key);
    // Le Blitz coûte 5 ⚡ au lancement, pas une de plus par erreur (chrono : voir applyAnswerAction).
    store.setProgress(r.progress);
    answeredRef.current += 1;
    if (ok) correctRef.current += 1;
    void (ok ? haptics.correct() : haptics.wrong());
    sounds.play(ok ? 'correct' : 'wrong');
    setFlash(ok ? 'ok' : 'ko');
    if (ok) setCorrect((c) => c + 1);
    nextTimer.current = setTimeout(() => {
      nextTimer.current = null;
      setFlash(null);
      setIndex((x) => x + 1);
    }, 250);
  };

  if (!init.started) {
    return (
      <Screen>
        <NoEnergySheet onClose={exitSession} />
      </Screen>
    );
  }

  if (ended) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.big}>{ended.isBest ? '🏆' : '⏱️'}</Text>
          <Text variant="title" style={styles.centerText}>
            {t('blitz.correct', { count: correct })}
          </Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('blitz.summary', { answered: ended.answered, seconds: BLITZ_SECONDS })} · {ended.isBest ? t('blitz.newRecord') : t('common.record', { value: ended.best })}
          </Text>
        </View>
        <Card>
          <Text variant="bodyBold">{t('blitz.xp', { xp: ended.xp })}</Text>
          <Text variant="small" secondary>
            {ended.answered >= 5 ? t('blitz.counted') : t('blitz.notCounted')}
          </Text>
        </Card>
        <Button label={t('blitz.replay')} color={color} onPress={() => router.replace({ pathname: '/session/blitz', params: { subjectId: subjectId ?? '' } })} />
        <Button label={t('common.back')} tone="secondary" onPress={exitSession} />
      </Screen>
    );
  }

  if (!presented) {
    return (
      <Screen>
        <Text variant="h2">{t('blitz.notEnough')}</Text>
        <Button label={t('common.back')} onPress={exitSession} />
      </Screen>
    );
  }

  const monoChoices = presented.choices.map((c) => isCodeChoice(presented.exercise.key, c, presented.choices.length));
  return (
    <Screen scrollKey={index}>
      <View style={styles.top}>
        <Pressable onPress={quit} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={left / BLITZ_SECONDS} color={left <= 10 ? colors.danger : color} height={14} />
        </View>
        <Text variant="bodyBold" style={{ color: left <= 10 ? colors.danger : colors.text }}>
          {t('common.seconds', { value: Math.max(0, left) })}
        </Text>
      </View>
      <View style={styles.score}>
        <Text variant="small" secondary>
          {subject?.emoji} {t('blitz.title', { subject: subject?.title ?? '' })}
        </Text>
        <View style={styles.inline}>
          <Icon name="checkmark-circle" size={18} color={colors.success} />
          <Text variant="bodyBold">{correct}</Text>
        </View>
      </View>
      <Text variant="h2">{presented.exercise.prompt}</Text>
      <View style={styles.choices}>
        {presented.choices.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => answer(i)}
            accessibilityRole="button"
            accessibilityState={{ disabled: flash !== null }}
            style={[
              styles.choice,
              {
                borderColor: flash && i === presented.answer ? colors.success : flash === 'ko' ? colors.danger : colors.border,
                backgroundColor: flash && i === presented.answer ? colors.successSoft : colors.surface,
              },
            ]}>
            <Text variant={monoChoices[i] ? 'mono' : 'body'} style={monoChoices[i] ? undefined : styles.choiceText}>
              {c}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  score: { flexDirection: 'row', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  choices: { gap: space.sm },
  choice: { borderWidth: 2, borderRadius: radius.md, padding: space.md },
  choiceText: { fontSize: 15, lineHeight: 21 },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  centerText: { textAlign: 'center' },
  big: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
});
