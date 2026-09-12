import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { SUBJECTS } from '@/content';
import { DAILY_GOALS, applySetDailyGoal } from '@/game';
import { requestReminderPermission } from '@/lib/notifications';
import { useProgress, useSettings } from '@/store/progress';
import { Button, FadeUp, Pop, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

const GOAL_LABELS: Record<number, [string, string]> = {
  20: ['Tranquille', '5 min par jour'],
  50: ['Régulier', '10 min par jour'],
  100: ['Sérieux', '20 min par jour'],
  200: ['Intense', '40 min par jour'],
};

/**
 * Trois écrans, une minute : la matière, l'objectif, les rappels.
 * Tout se change ensuite dans le Profil.
 */
export default function OnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState(0);
  const [subject, setSubject] = useState<string>(SUBJECTS[0].id);
  const [goal, setGoal] = useState<number>(50);
  const [reminders, setReminders] = useState(true);
  const [hour, setHour] = useState(19);

  const finish = async () => {
    const settings = useSettings.getState();
    const progress = useProgress.getState();
    settings.setFavoriteSubject(subject);
    progress.setProgress(applySetDailyGoal(progress.progress, goal));
    settings.setReminderHour(hour);
    settings.setReminders(reminders ? await requestReminderPermission() : false);
    settings.setOnboardingDone(true);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Text variant="small" secondary>
          {step + 1} / 3
        </Text>
        <View style={styles.bar}>
          <ProgressBar ratio={(step + 1) / 3} height={6} />
        </View>
      </View>

      {step === 0 && (
        <FadeUp key="s0" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🗺️</Text>
          </Pop>
          <Text variant="title">Par quoi on commence ?</Text>
          <Text variant="body" secondary>
            Quatre chemins, indépendants. Tu pourras changer à tout moment — celui-ci s’ouvrira en premier.
          </Text>
          <View style={styles.list}>
            {SUBJECTS.map((s) => {
              const active = s.id === subject;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSubject(s.id)}
                  style={[styles.card, { borderColor: active ? s.color : colors.border, backgroundColor: active ? colors.surfaceAlt : colors.surface }]}>
                  <Text style={styles.emoji}>{s.emoji}</Text>
                  <View style={styles.cardText}>
                    <Text variant="bodyBold">{s.title}</Text>
                    <Text variant="small" secondary>
                      {s.tagline}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Button label="Continuer" onPress={() => setStep(1)} />
        </FadeUp>
      )}

      {step === 1 && (
        <FadeUp key="s1" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🎯</Text>
          </Pop>
          <Text variant="title">Ton objectif du jour</Text>
          <Text variant="body" secondary>
            Des XP à gagner chaque jour. Un anneau sur l’accueil te montre où tu en es ; l’atteindre rapporte des gemmes.
          </Text>
          <View style={styles.list}>
            {DAILY_GOALS.map((g) => {
              const active = g === goal;
              const [name, time] = GOAL_LABELS[g];
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  style={[styles.card, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.surfaceAlt : colors.surface }]}>
                  <Text variant="h2" style={styles.goalNumber}>
                    {g}
                  </Text>
                  <View style={styles.cardText}>
                    <Text variant="bodyBold">{name}</Text>
                    <Text variant="small" secondary>
                      {time} · {g} XP
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.row}>
            <Button label="Retour" tone="ghost" onPress={() => setStep(0)} />
            <Button label="Continuer" style={styles.grow} onPress={() => setStep(2)} />
          </View>
        </FadeUp>
      )}

      {step === 2 && (
        <FadeUp key="s2" style={styles.stepWrap}>
          <Pop>
            <Text style={styles.big}>🔥</Text>
          </Pop>
          <Text variant="title">Garde ta série</Text>
          <Text variant="body" secondary>
            Une session par jour entretient la série. Un rappel le soir évite de la perdre bêtement — sur Android, pas sur le site.
          </Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between' }]}>
            <Text variant="bodyBold">Me rappeler</Text>
            <Switch value={reminders} onValueChange={setReminders} />
          </View>
          {reminders && (
            <View style={styles.hours}>
              {[8, 12, 19, 21].map((h) => (
                <Button key={h} label={`${h} h`} tone={h === hour ? 'primary' : 'secondary'} style={styles.grow} onPress={() => setHour(h)} />
              ))}
            </View>
          )}
          <View style={[styles.rules, { backgroundColor: colors.surfaceAlt }]}>
            <Text variant="small">⚡ Une leçon coûte 5 points d’énergie sur 25 ; ils reviennent avec le temps. Réviser est gratuit.</Text>
            <Text variant="small">👑 Chaque unité a 5 couronnes : 3 pour avancer, 5 pour la maîtriser — et elles se fissurent si tu ne reviens pas.</Text>
            <Text variant="small">💎 Les gemmes s’achètent en jouant, jamais avec de l’argent.</Text>
          </View>
          <View style={styles.row}>
            <Button label="Retour" tone="ghost" onPress={() => setStep(1)} />
            <Button label="C’est parti !" style={styles.grow} onPress={() => void finish()} />
          </View>
        </FadeUp>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bar: { flex: 1 },
  stepWrap: { gap: space.lg },
  big: { fontSize: 56, textAlign: 'center' },
  list: { gap: space.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radius.lg, padding: space.md },
  cardText: { flex: 1, gap: 2 },
  emoji: { fontSize: 28 },
  goalNumber: { width: 48, textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  hours: { flexDirection: 'row', gap: space.sm },
  rules: { borderRadius: radius.md, padding: space.md, gap: space.sm },
});
