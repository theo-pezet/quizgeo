import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useContent } from '@/content/useContent';
import { pickListenCards, toDayKey } from '@/game';
import { useT } from '@/i18n';
import { speak, stopSpeaking } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { Button, Icon, ProgressBar, Screen, Text, radius, space, tint, useColors } from '@/ui';

/** Temps laissé pour dire la définition à voix haute, avant de l'entendre. */
const PAUSE_MS = 4000;
/** Temps entre deux cartes. */
const GAP_MS = 1200;

type Phase = 'term' | 'pause' | 'answer' | 'gap';

/**
 * Mode écoute : réviser le deck sans regarder l'écran (transports, marche).
 * Pour chaque carte : le terme est lu, une pause laisse le temps de dire sa
 * définition à voix haute (rappel + effet de production), puis la réponse est
 * lue. Aucune note n'est donnée : la planification du deck ne bouge pas.
 */
export default function DeckListenRoute() {
  const colors = useColors();
  const t = useT();
  const { CARDS, CARD_BY_ID, cardIdsOf, SUBJECT_BY_ID } = useContent();
  const { subjectId } = useLocalSearchParams<{ subjectId?: string }>();
  const [ids] = useState(() => {
    const all = subjectId ? cardIdsOf(subjectId) : CARDS.map((c) => c.id);
    return pickListenCards(useProgress.getState().progress.cards, all, toDayKey(new Date()));
  });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('term');
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = ids[index] ? CARD_BY_ID.get(ids[index]) : undefined;
  const done = index >= ids.length;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  // La boucle : chaque phase lance la suivante quand elle se termine.
  useEffect(() => {
    if (!playing || !card) return undefined;
    let cancelled = false;
    const go = (p: Phase) => {
      if (!cancelled) setPhase(p);
    };
    if (phase === 'term') speak(card.term, () => go('pause'));
    else if (phase === 'pause') timer.current = setTimeout(() => go('answer'), PAUSE_MS);
    else if (phase === 'answer') speak(card.example ? `${card.definition} ${t('learn.example')}: ${card.example}` : card.definition, () => go('gap'));
    else
      timer.current = setTimeout(() => {
        if (cancelled) return;
        setIndex((i) => i + 1);
        setPhase('term');
      }, GAP_MS);
    return () => {
      cancelled = true;
      clear();
    };
  }, [playing, phase, card, t]);

  // On quitte l'écran : la voix s'arrête.
  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
    } else {
      setPhase('term');
      setPlaying(true);
    }
  };
  const skip = () => {
    stopSpeaking();
    clear();
    setIndex((i) => i + 1);
    setPhase('term');
  };
  const restart = () => {
    setIndex(0);
    setPhase('term');
    setPlaying(true);
  };

  const subject = card ? SUBJECT_BY_ID.get(card.subject) : undefined;
  const accent = subject?.color ?? colors.primary;
  const revealed = phase === 'answer' || phase === 'gap';

  const footer =
    ids.length === 0 ? (
      <Button label={t('common.back')} onPress={() => router.back()} />
    ) : done ? (
      <View style={styles.row}>
        <Button label={t('listen.again')} tone="outline" onPress={restart} style={styles.grow} />
        <Button label={t('common.back')} onPress={() => router.back()} style={styles.grow} />
      </View>
    ) : (
      <View style={styles.row}>
        <Button label={playing ? t('listen.pause') : index === 0 && phase === 'term' ? t('listen.start') : t('listen.resume')} color={accent} onPress={toggle} style={styles.grow} />
        <Button label={t('listen.next')} tone="outline" onPress={skip} style={styles.grow} />
      </View>
    );

  return (
    <Screen footer={footer}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Icon name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.grow}>
          <ProgressBar ratio={ids.length === 0 ? 0 : Math.min(index, ids.length) / ids.length} color={accent} height={14} />
        </View>
        <Text variant="small" secondary>
          {Math.min(index + 1, ids.length)}/{ids.length}
        </Text>
      </View>
      <Text variant="title">{t('listen.title')}</Text>
      <Text variant="small" secondary>
        {t('listen.blurb')}
      </Text>
      {ids.length === 0 ? (
        <Text variant="body">{t('listen.empty')}</Text>
      ) : done || !card ? (
        <Text variant="h2">{t('listen.done')}</Text>
      ) : (
        <View style={[styles.card, { borderColor: accent, backgroundColor: tint(accent, 0.93) }]}>
          <Icon name={playing ? 'volume-high' : 'volume-mute'} size={28} color={accent} />
          <Text variant="title" style={styles.center}>
            {card.term}
          </Text>
          {phase === 'pause' && playing && (
            <Text variant="bodyBold" style={[styles.center, { color: accent }]}>
              {t('listen.yourTurn')}
            </Text>
          )}
          {revealed && (
            <Text variant="body" style={styles.center}>
              {card.definition}
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.xl, gap: space.md, alignItems: 'center', minHeight: 240, justifyContent: 'center' },
  center: { textAlign: 'center' },
});
