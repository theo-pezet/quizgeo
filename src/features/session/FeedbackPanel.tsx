import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Exercise } from '@/game';
import { useT } from '@/i18n';
import { buildAskPrompt, claudeUrl, deviceLocale } from '@/lib/askClaude';
import { Button, FadeUp, Icon, Shake, Text, space, useColors } from '@/ui';

import type { Feedback } from './useSession';

/** Couleurs de la barre du bas selon la réponse (fond, bordure, texte). */
export function feedbackTone(colors: ReturnType<typeof useColors>, correct: boolean) {
  return correct
    ? { background: colors.successSoft, border: colors.success, text: colors.success }
    : { background: colors.dangerSoft, border: colors.danger, text: colors.danger };
}

/**
 * Le verdict, affiché dans la barre FIXE du bas de l'écran (Screen.footer) :
 * le bouton « Continuer » est toujours visible sans défiler. Les
 * explications défilent dans la barre si elles sont longues.
 */
export function FeedbackPanel({
  feedback,
  combo,
  onNext,
  nextLabel,
  ask,
}: {
  feedback: Feedback;
  combo: number;
  onNext: () => void;
  nextLabel?: string;
  /** L'exercice répondu : affiche « Ask Claude » et « Share ». */
  ask?: { exercise: Exercise; unitTitle?: string };
}) {
  const colors = useColors();
  const t = useT();
  const { height } = useWindowDimensions();
  const tone = feedbackTone(colors, feedback.correct);
  const hasWhy = !feedback.correct && !!feedback.whyWrong;
  return (
    <FadeUp>
      <Shake trigger={feedback.correct ? null : 1}>
        <View style={styles.panel}>
          <View style={styles.head}>
            <Icon name={feedback.correct ? 'checkmark-circle' : 'close-circle'} size={28} color={tone.text} />
            <Text variant="h2" style={{ color: tone.text }}>
              {feedback.correct ? (combo >= 3 ? t('session.correctCombo', { combo }) : t('session.correct')) : t('session.wrong')}
            </Text>
          </View>
          {feedback.pretest && (
            <Text variant="small" secondary>
              {t('session.pretest.note')}
            </Text>
          )}
          {feedback.confidentMiss && (
            <Text variant="small" style={{ color: tone.text, fontWeight: '700' }}>
              {t('session.sure.miss')}
            </Text>
          )}
          {(hasWhy || feedback.explain) && (
            <ScrollView style={{ maxHeight: Math.round(height * 0.3) }} contentContainerStyle={styles.body} showsVerticalScrollIndicator>
              {hasWhy && (
                <View style={[styles.why, { borderLeftColor: tone.border }]}>
                  <Text variant="small" style={[styles.label, { color: tone.text }]}>
                    {t('session.whyWrong')}
                  </Text>
                  <Text variant="small" style={styles.explain}>
                    {feedback.whyWrong}
                  </Text>
                </View>
              )}
              {feedback.explain && (
                <View style={styles.remember}>
                  {hasWhy && (
                    <Text variant="small" secondary style={styles.label}>
                      {t('session.remember')}
                    </Text>
                  )}
                  <Text variant="small" style={styles.explain}>
                    {feedback.explain}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          {ask && <AskRow feedback={feedback} exercise={ask.exercise} unitTitle={ask.unitTitle} tint={tone.text} />}
          <Button label={nextLabel ?? t('common.continue')} tone={feedback.correct ? 'success' : 'danger'} onPress={onNext} />
        </View>
      </Shake>
    </FadeUp>
  );
}

/**
 * « Ask Claude » ouvre une conversation Claude avec la question, la réponse
 * donnée, la bonne réponse et l'explication déjà écrites (l'app Claude sur
 * Android si elle est installée, sinon le navigateur). « Share » envoie le
 * même texte où l'on veut (copier, une autre IA, un ami) ; sur le web, sans
 * partage natif, il est copié dans le presse-papiers.
 */
function AskRow({ feedback, exercise, unitTitle, tint }: { feedback: Feedback; exercise: Exercise; unitTitle?: string; tint: string }) {
  const t = useT();
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const prompt = () => buildAskPrompt({ exercise, unitTitle, correct: feedback.correct, given: feedback.given, whyWrong: feedback.whyWrong, locale: deviceLocale() });

  const openClaude = () => {
    const url = claudeUrl(prompt());
    // Web : un nouvel onglet, sinon on quitte la leçon en cours.
    if (Platform.OS === 'web') {
      (globalThis as { open?: (url: string, target: string, features: string) => unknown }).open?.(url, '_blank', 'noopener');
      return;
    }
    void Linking.openURL(url).catch(() => undefined);
  };
  const share = async () => {
    const text = prompt();
    if (Platform.OS !== 'web') {
      await Share.share({ message: text }).catch(() => undefined);
      return;
    }
    const nav = (globalThis as { navigator?: { share?: (d: { text: string }) => Promise<void>; clipboard?: { writeText: (s: string) => Promise<void> } } }).navigator;
    if (nav?.share) {
      await nav.share({ text }).catch(() => undefined);
    } else if (nav?.clipboard) {
      const ok = await nav.clipboard.writeText(text).then(
        () => true,
        () => false,
      );
      setCopied(ok);
    }
  };

  return (
    <View style={styles.ask}>
      <Pressable onPress={openClaude} accessibilityRole="link" accessibilityHint={t('session.ask.hint')} hitSlop={8} style={[styles.askBtn, { borderColor: tint }]}>
        <Icon name="sparkles" size={16} color={tint} />
        <Text variant="small" style={{ color: tint, fontWeight: '800' }}>
          {t('session.ask')}
        </Text>
      </Pressable>
      <Pressable onPress={() => void share()} accessibilityRole="button" accessibilityLabel={t('session.ask.share')} hitSlop={8} style={[styles.askBtn, { borderColor: colors.border }]}>
        <Icon name={copied ? 'checkmark' : 'share-outline'} size={16} color={colors.textSecondary} />
        <Text variant="small" secondary style={{ fontWeight: '700' }}>
          {copied ? t('session.ask.copied') : t('session.ask.share')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ask: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  askBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: 999, paddingVertical: 4, paddingHorizontal: space.sm },
  panel: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  body: { gap: space.md },
  explain: { lineHeight: 19 },
  label: { fontWeight: '800', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  why: { borderLeftWidth: 3, paddingLeft: space.sm, gap: 2 },
  remember: { gap: 2 },
});
