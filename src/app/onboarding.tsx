import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useContent } from '@/content/useContent';
import { DAILY_GOALS, applySetDailyGoal } from '@/game';
import { LANGS, detectLang, useT, type Lang } from '@/i18n';
import { requestReminderPermission } from '@/lib/notifications';
import { useProgress, useSettings } from '@/store/progress';
import { Button, FadeUp, Icon, Pop, ProgressBar, Screen, Text, radius, space, tint, useColors } from '@/ui';

const GOAL_MINUTES: Record<number, number> = { 20: 5, 50: 10, 100: 20, 200: 40 };
const HOURS = [8, 12, 19, 21];
const STEPS = 5;

/**
 * Cinq écrans, deux minutes : la langue, les matières (une ou plusieurs),
 * le niveau (partir de zéro ou passer un test), l'objectif, les rappels.
 * Tout se change ensuite dans le Profil. Le choix de langue s'applique
 * immédiatement : l'écran suivant est déjà traduit.
 */
export default function OnboardingScreen() {
  const colors = useColors();
  const t = useT();
  const { SUBJECTS } = useContent();
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const [step, setStep] = useState(0);
  const previous = useSettings((s) => s.subjects);
  const [subjects, setSubjects] = useState<string[]>(previous && previous.length > 0 ? previous : [SUBJECTS[0].id]);
  const [tests, setTests] = useState<string[]>([]);
  const [goal, setGoal] = useState<number>(50);
  const [reminders, setReminders] = useState(true);
  const [hour, setHour] = useState(19);
  const chosenLang: Lang = lang ?? detectLang();

  const finish = async () => {
    const settings = useSettings.getState();
    const progress = useProgress.getState();
    if (!settings.lang) settings.setLang(chosenLang);
    const chosen = SUBJECTS.filter((x) => subjects.includes(x.id)).map((x) => x.id);
    settings.setSubjects(chosen.length === SUBJECTS.length ? null : chosen);
    settings.setFavoriteSubject(chosen[0] ?? SUBJECTS[0].id);
    progress.setProgress(applySetDailyGoal(progress.progress, goal));
    settings.setReminderHour(hour);
    settings.setReminders(reminders ? await requestReminderPermission() : false);
    settings.setOnboardingDone(true);
    const queue = chosen.filter((id) => tests.includes(id));
    if (queue.length > 0) {
      router.replace({ pathname: '/placement/[subjectId]', params: { subjectId: queue[0], queue: queue.slice(1).join(',') } });
    } else {
      router.replace('/');
    }
  };
  const toggleSubject = (id: string) =>
    setSubjects((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id]));
  const toggleTest = (id: string) => setTests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const footer =
    step === 0 ? (
      <Button label={t('common.continue')} onPress={() => setStep(1)} />
    ) : (
      <View style={styles.row}>
        <Button label={t('common.back')} tone="ghost" onPress={() => setStep(step - 1)} />
        <Button label={step === STEPS - 1 ? t('onboarding.go') : t('common.continue')} style={styles.grow} onPress={() => (step === STEPS - 1 ? void finish() : setStep(step + 1))} />
      </View>
    );

  return (
    <Screen footer={footer}>
      <View style={styles.top}>
        <Text variant="small" secondary>
          {t('onboarding.step', { step: step + 1, total: STEPS })}
        </Text>
        <View style={styles.bar}>
          <ProgressBar ratio={(step + 1) / STEPS} height={8} />
        </View>
      </View>

      {step === 0 && (
        <FadeUp key="s0" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🌍</Text>
          </Pop>
          <Text variant="title" style={styles.centerText}>{t('onboarding.lang.title')}</Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('onboarding.lang.body')}
          </Text>
          <View style={styles.list}>
            {LANGS.map((l) => {
              const active = l.id === chosenLang;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setLang(l.id)}
                  style={[styles.card, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? tint(colors.primary, 0.9) : colors.surface }]}>
                  <Text style={styles.emoji}>{l.flag}</Text>
                  <Text variant="bodyBold" style={styles.grow}>
                    {l.label}
                  </Text>
                  {active && <Icon name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </FadeUp>
      )}

      {step === 1 && (
        <FadeUp key="s1" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🗺️</Text>
          </Pop>
          <Text variant="title" style={styles.centerText}>{t('onboarding.subjects.title')}</Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('onboarding.subjects.body')}
          </Text>
          <View style={styles.list}>
            {SUBJECTS.map((s) => {
              const active = subjects.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => toggleSubject(s.id)}
                  style={[styles.card, { borderColor: active ? s.color : colors.border, backgroundColor: active ? tint(s.color, 0.88) : colors.surface }]}>
                  <Text style={styles.emoji}>{s.emoji}</Text>
                  <View style={styles.cardText}>
                    <Text variant="bodyBold">{s.title}</Text>
                    <Text variant="small" secondary>
                      {s.tagline}
                    </Text>
                  </View>
                  <Icon name={active ? 'checkbox' : 'square-outline'} size={24} color={active ? s.color : colors.borderStrong} />
                </Pressable>
              );
            })}
          </View>
        </FadeUp>
      )}

      {step === 2 && (
        <FadeUp key="s2" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🎓</Text>
          </Pop>
          <Text variant="title" style={styles.centerText}>{t('onboarding.level.title')}</Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('onboarding.level.body')}
          </Text>
          <View style={styles.list}>
            {SUBJECTS.filter((s) => subjects.includes(s.id)).map((s) => {
              const test = tests.includes(s.id);
              return (
                <View key={s.id} style={[styles.levelCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text variant="bodyBold">
                    {s.emoji} {s.title}
                  </Text>
                  <Button label={t('onboarding.level.zero')} size="sm" tone={test ? 'secondary' : 'primary'} color={test ? undefined : s.color} onPress={() => test && toggleTest(s.id)} />
                  <Button label={t('onboarding.level.test')} size="sm" tone={test ? 'primary' : 'secondary'} color={test ? s.color : undefined} onPress={() => !test && toggleTest(s.id)} />
                </View>
              );
            })}
          </View>
        </FadeUp>
      )}

      {step === 3 && (
        <FadeUp key="s3" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🎯</Text>
          </Pop>
          <Text variant="title" style={styles.centerText}>{t('onboarding.goal.title')}</Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('onboarding.goal.body')}
          </Text>
          <View style={styles.list}>
            {DAILY_GOALS.map((g) => {
              const active = g === goal;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  style={[styles.card, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? tint(colors.primary, 0.9) : colors.surface }]}>
                  <Text variant="h2" style={styles.goalNumber}>
                    {g}
                  </Text>
                  <View style={styles.cardText}>
                    <Text variant="bodyBold">{t(`onboarding.goal.${g}` as 'onboarding.goal.20')}</Text>
                    <Text variant="small" secondary>
                      {t('onboarding.goal.time', { minutes: GOAL_MINUTES[g], xp: g })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </FadeUp>
      )}

      {step === 4 && (
        <FadeUp key="s4" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🔥</Text>
          </Pop>
          <Text variant="title" style={styles.centerText}>{t('onboarding.reminders.title')}</Text>
          <Text variant="body" secondary style={styles.centerText}>
            {t('onboarding.reminders.body')}
          </Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between' }]}>
            <Text variant="bodyBold">{t('onboarding.reminders.toggle')}</Text>
            <Switch value={reminders} onValueChange={setReminders} trackColor={{ true: colors.success }} />
          </View>
          {reminders && (
            <View style={styles.hours}>
              {HOURS.map((h) => (
                <Button key={h} label={t('common.hours', { count: h })} size="sm" tone={h === hour ? 'primary' : 'secondary'} style={styles.grow} onPress={() => setHour(h)} />
              ))}
            </View>
          )}
          <View style={[styles.rules, { backgroundColor: colors.surfaceAlt }]}>
            <Rule icon="flash" color={colors.energy} text={t('onboarding.rule.energy')} />
            <Rule icon="ribbon" color={colors.gold} text={t('onboarding.rule.crowns')} />
            <Rule icon="diamond" color={colors.gem} text={t('onboarding.rule.gems')} />
          </View>
        </FadeUp>
      )}
    </Screen>
  );
}

function Rule({ icon, color, text }: { icon: 'flash' | 'ribbon' | 'diamond'; color: string; text: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="small" style={styles.grow}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  stepWrap: { gap: space.lg },
  centerText: { textAlign: 'center' },
  big: { fontSize: 56, lineHeight: 68, textAlign: 'center' },
  list: { gap: space.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radius.lg, padding: space.md },
  cardText: { flex: 1, gap: 2 },
  emoji: { fontSize: 28 },
  goalNumber: { width: 48, textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  hours: { flexDirection: 'row', gap: space.sm },
  rules: { borderRadius: radius.md, padding: space.md, gap: space.md },
  levelCard: { borderWidth: 2, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  rule: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
