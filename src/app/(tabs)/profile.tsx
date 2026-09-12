import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { CARDS, CATALOG, EXERCISES, SUBJECTS, UNITS } from '@/content';
import { BADGES, MAX_FREEZES, SHOP, allUnitTraits, applyBuyRefill, boostMinutesLeft, buyBoost, buyFreeze, currentEnergy, deckStats, isActiveToday, levelProgress, reviewQueueSize, streakIsAtRisk, toDayKey } from '@/game';
import { confirm } from '@/lib/confirm';
import { requestReminderPermission } from '@/lib/notifications';
import { useProgress, useSettings } from '@/store/progress';
import { Button, Card, EnergyBadge, ProgressBar, Screen, Text, radius, space, useColors } from '@/ui';

export default function ProfileScreen() {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const reset = useProgress((s) => s.reset);
  const setProgress = useProgress((s) => s.setProgress);
  const hapticsOn = useSettings((s) => s.haptics);
  const setHaptics = useSettings((s) => s.setHaptics);
  const remindersOn = useSettings((s) => s.reminders);
  const setReminders = useSettings((s) => s.setReminders);
  const reminderHour = useSettings((s) => s.reminderHour);
  const setReminderHour = useSettings((s) => s.setReminderHour);

  const now = new Date();
  const today = toDayKey(now);
  const level = levelProgress(progress.xp);
  const traits = allUnitTraits(progress, EXERCISES, CATALOG, today);
  const energyValue = currentEnergy(progress.energy, now);
  const boostLeft = boostMinutesLeft(progress.boost, now);
  const buy = (next: typeof progress | null) => {
    if (next) setProgress(next);
  };
  const crowns = Object.values(traits).reduce<number>((a, t) => a + t, 0);
  const queue = reviewQueueSize(progress);
  const deck = deckStats(progress.cards, CARDS.map((c) => c.id), today);
  const badgesEarned = Object.keys(progress.badges).length;

  return (
    <Screen>
      <Text variant="title">Profil</Text>

      <Card>
        <Text variant="h2">Niveau {level.level}</Text>
        <ProgressBar ratio={level.ratio} />
        <Text variant="small" secondary>
          {progress.xp} XP · {level.xpToNextLevel} XP avant le niveau {level.level + 1}
        </Text>
      </Card>

      <View style={styles.grid}>
        <Tile emoji={isActiveToday(progress.streak, today) ? '🔥' : streakIsAtRisk(progress.streak, today) ? '⚠️' : '🩶'} value={`${progress.streak.current}`} label={`jours de série · record ${progress.streak.best}`} />
        <Tile emoji="🧊" value={`${progress.streak.freezes}`} label="gels (1 tous les 7 jours, max 2)" />
        <Tile emoji="👑" value={`${crowns}`} label={`couronnes sur ${UNITS.length * 5}`} />
        <Tile emoji="🃏" value={`${deck.review}`} label={`cartes acquises sur ${deck.total}`} />
      </View>

      {streakIsAtRisk(progress.streak, today) && (
        <Card style={{ borderColor: colors.danger }}>
          <Text variant="bodyBold">Ta série est en jeu aujourd’hui</Text>
          <Text variant="small" secondary>
            Termine une session d’au moins 5 exercices ou 5 cartes avant minuit.
          </Text>
        </Card>
      )}

      <Card>
        <View style={styles.row}>
          <Text variant="h2">Boutique</Text>
          <Text variant="h2">💎 {progress.gems}</Text>
        </View>
        <EnergyBadge energy={progress.energy} now={now} />
        <Button
          label={`Recharger l’énergie · 💎 ${SHOP.refill.cost}`}
          tone="secondary"
          disabled={progress.gems < SHOP.refill.cost || energyValue >= 25}
          onPress={() => buy(applyBuyRefill(progress, new Date()))}
        />
        <Button
          label={`Gel de série (${progress.streak.freezes}/${MAX_FREEZES}) · 💎 ${SHOP.freeze.cost}`}
          tone="secondary"
          disabled={progress.gems < SHOP.freeze.cost || progress.streak.freezes >= MAX_FREEZES}
          onPress={() => buy(buyFreeze(progress))}
        />
        <Button
          label={boostLeft > 0 ? `Boost XP ×2 actif (${boostLeft} min) · prolonger 💎 ${SHOP.boost.cost}` : `Boost XP ×2 pendant ${SHOP.boost.minutes} min · 💎 ${SHOP.boost.cost}`}
          tone="secondary"
          disabled={progress.gems < SHOP.boost.cost}
          onPress={() => buy(buyBoost(progress, new Date()))}
        />
        <Text variant="small" secondary>
          Les gemmes se gagnent en jouant : leçon +10, sans-faute +20, quêtes, paliers de série (7 j : 50, 30 j : 200).
        </Text>
      </Card>

      <Card>
        <Text variant="h2">Entraînement</Text>
        <Button label={queue > 0 ? `Revoir mes ${queue} erreur${queue > 1 ? 's' : ''}` : 'Aucune erreur à revoir'} tone="secondary" disabled={queue === 0} onPress={() => router.push('/session/review')} />
        {SUBJECTS.map((s) => (
          <Button key={s.id} label={`${s.emoji} Session libre · ${s.title}`} color={s.color} onPress={() => router.push({ pathname: '/session/free', params: { subjectId: s.id } })} />
        ))}
      </Card>

      <Card>
        <Text variant="h2">⏱️ Blitz</Text>
        <Text variant="small" secondary>
          60 secondes, un maximum de bonnes réponses, XP doublés. Coûte 5 ⚡.
        </Text>
        {SUBJECTS.map((s) => (
          <Button
            key={s.id}
            label={`${s.emoji} ${s.title}${progress.blitz[s.id] ? ` · record ${progress.blitz[s.id]}` : ''}`}
            tone="secondary"
            onPress={() => router.push({ pathname: '/session/blitz', params: { subjectId: s.id } })}
          />
        ))}
      </Card>

      <Card>
        <Text variant="h2">
          Badges · {badgesEarned}/{BADGES.length}
        </Text>
        <View style={styles.badges}>
          {BADGES.map((b) => {
            const earned = progress.badges[b.id] !== undefined;
            return (
              <View key={b.id} style={[styles.badge, { backgroundColor: earned ? colors.successSoft : colors.surfaceAlt, opacity: earned ? 1 : 0.6 }]}>
                <Text variant="small">
                  {earned ? '🏅' : '🔒'} {b.name}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text variant="h2">Réglages</Text>
        <View style={styles.row}>
          <Text variant="body">Vibrations</Text>
          <Switch value={hapticsOn} onValueChange={setHaptics} />
        </View>
        <View style={styles.row}>
          <Text variant="body">Rappels (série, énergie)</Text>
          <Switch
            value={remindersOn}
            onValueChange={async (on) => {
              if (on && !(await requestReminderPermission())) {
                setReminders(false);
                return;
              }
              setReminders(on);
            }}
          />
        </View>
        {remindersOn && (
          <View style={styles.row}>
            <Text variant="small" secondary>
              Rappel de série à {reminderHour} h
            </Text>
            <View style={styles.hours}>
              {[8, 12, 19, 21].map((h) => (
                <Button key={h} label={`${h} h`} tone={h === reminderHour ? 'primary' : 'secondary'} style={styles.hour} onPress={() => setReminderHour(h)} />
              ))}
            </View>
          </View>
        )}
        <Text variant="small" secondary>
          Les rappels ne fonctionnent que dans l’application Android, pas sur le site.
        </Text>
        <Button
          label="Réinitialiser ma progression"
          tone="danger"
          onPress={() => confirm('Tout effacer ?', 'XP, série, couronnes, badges et deck repartent de zéro. Irréversible.', reset)}
        />
      </Card>

      <Text variant="small" secondary style={styles.footer}>
        Quiz GEO · {UNITS.length} unités · {EXERCISES.length} exercices · {CARDS.length} cartes · sans publicité
      </Text>
    </Screen>
  );
}

function Tile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="h2">
        {emoji} {value}
      </Text>
      <Text variant="small" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: { borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  hours: { flexDirection: 'row', gap: 4 },
  hour: { paddingVertical: 6, paddingHorizontal: 10 },
  footer: { textAlign: 'center', paddingBottom: space.xl },
});
