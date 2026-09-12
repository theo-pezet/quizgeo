import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATALOG, EXERCISES, SUBJECT_BY_ID, exercisesOfSubject } from '@/content';
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
import { haptics } from '@/lib/haptics';
import { sounds } from '@/lib/sounds';
import { useProgress } from '@/store/progress';
import { Button, Card, NoEnergySheet, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

const BLITZ_SECONDS = 60;
const POOL = 60;

/**
 * Blitz : 60 secondes, des QCM sans explication, XP doublés (chrono).
 * Compte comme une session libre : coûte 5 ⚡, nourrit la série à partir
 * de 5 réponses.
 */
export default function BlitzRoute() {
  const colors = useColors();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const subject = SUBJECT_BY_ID.get(subjectId ?? '');
  const color = subject?.color ?? colors.primary;

  const init = useMemo(() => {
    const store = useProgress.getState();
    const started = applyStartLesson(store.progress, 'free', new Date());
    if (started === null) return { started: false, queue: [] as QcmExercise[], startProgress: store.progress };
    store.setProgress(started);
    const pool = exercisesOfSubject(subjectId ?? '').filter((e): e is QcmExercise => e.kind === 'qcm' && e.choices.length > 2);
    const queue = composeFreeSession(pool, Math.random, POOL) as QcmExercise[];
    return { started: true, queue, startProgress: started };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startProgress = useRef<Progress>(init.startProgress);
  const credited = useRef(new Set<string>());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [flash, setFlash] = useState<'ok' | 'ko' | null>(null);
  const [ended, setEnded] = useState<{ xp: number; isBest: boolean; best: number } | null>(null);
  const [running, setRunning] = useState(init.started && init.queue.length > 0);

  const exercise = init.queue[index];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const presented = useMemo(() => (exercise ? presentQcm(exercise, Math.random) : null), [exercise?.key]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && (left <= 0 || index >= init.queue.length)) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, index, running]);

  const finish = () => {
    setRunning(false);
    sounds.play('timeup');
    const store = useProgress.getState();
    const answered = index;
    const result = applySessionEnd(store.progress, {
      mode: 'free',
      unitId: null,
      questionCount: answered,
      correctCount: correct,
      chrono: true,
      now: new Date(),
      questions: EXERCISES,
      catalog: CATALOG,
      progressAtSessionStart: startProgress.current,
    });
    const blitz = applyBlitzResult(result.progress, subjectId ?? '', correct);
    store.setProgress(blitz.progress);
    setEnded({ xp: result.progress.xp - startProgress.current.xp, isBest: blitz.isBest, best: blitz.progress.blitz[subjectId ?? ''] ?? 0 });
  };

  const answer = (i: number) => {
    if (!presented || !running || flash) return;
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
    store.setProgress(r.progress);
    void (ok ? haptics.correct() : haptics.wrong());
    sounds.play(ok ? 'correct' : 'wrong');
    setFlash(ok ? 'ok' : 'ko');
    if (ok) setCorrect((c) => c + 1);
    setTimeout(() => {
      setFlash(null);
      setIndex((x) => x + 1);
    }, 250);
  };

  if (!init.started) {
    return (
      <Screen>
        <NoEnergySheet onClose={() => router.back()} />
      </Screen>
    );
  }

  if (ended) {
    return (
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.big}>{ended.isBest ? '🏆' : '⏱️'}</Text>
          <Text variant="title">{correct} bonne{correct > 1 ? 's' : ''} réponse{correct > 1 ? 's' : ''}</Text>
          <Text variant="body" secondary>
            sur {index} en {BLITZ_SECONDS} s{ended.isBest ? ' · nouveau record !' : ` · record ${ended.best}`}
          </Text>
        </View>
        <Card>
          <Text variant="bodyBold">✨ +{ended.xp} XP (chrono ×2)</Text>
          <Text variant="small" secondary>
            {index >= 5 ? 'La session compte pour la série et la ligue.' : 'Réponds à 5 questions au moins pour la série.'}
          </Text>
        </Card>
        <Button label="Rejouer" color={color} onPress={() => router.replace({ pathname: '/session/blitz', params: { subjectId: subjectId ?? '' } })} />
        <Button label="Retour" tone="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!presented) {
    return (
      <Screen>
        <Text variant="h2">Pas assez d’exercices pour un Blitz.</Text>
        <Button label="Retour" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text variant="h2" secondary>
            ✕
          </Text>
        </Pressable>
        <View style={styles.bar}>
          <ProgressBar ratio={left / BLITZ_SECONDS} color={left <= 10 ? colors.danger : color} />
        </View>
        <Text variant="bodyBold" style={{ color: left <= 10 ? colors.danger : colors.text }}>
          {left}s
        </Text>
      </View>
      <View style={styles.score}>
        <Text variant="small" secondary>
          {subject?.emoji} Blitz · {subject?.title}
        </Text>
        <Text variant="bodyBold">✅ {correct}</Text>
      </View>
      <Text variant="h2">{presented.exercise.prompt}</Text>
      <View style={styles.choices}>
        {presented.choices.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => answer(i)}
            style={[
              styles.choice,
              {
                borderColor: flash && i === presented.answer ? colors.success : flash === 'ko' ? colors.danger : colors.border,
                backgroundColor: flash && i === presented.answer ? colors.successSoft : colors.surface,
              },
            ]}>
            <Text style={styles.choiceText}>{c}</Text>
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
  choices: { gap: space.sm },
  choice: { borderWidth: 2, borderRadius: radius.md, padding: space.md },
  choiceText: { fontSize: 15, lineHeight: 21 },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  big: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
});
