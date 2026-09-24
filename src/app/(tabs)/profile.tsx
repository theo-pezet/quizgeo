import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, View } from 'react-native';

import { CATALOG } from '@/content';
import { useContent } from '@/content/useContent';
import { useActiveSubjects } from '@/content/useSubjects';
import { BADGES, DAILY_GOALS, MAX_FREEZES, MONTHLY_TARGET, SHOP, allUnitTraits, applyBuyRefill, applySetDailyGoal, boostMinutesLeft, buyBoost, buyFreeze, currentEnergy, deckStats, displayedStreak, isActiveToday, levelProgress, reviewQueueSize, streakIsAtRisk, toDayKey } from '@/game';
import { LANGS, monthLabel, useLang, useT, type Key } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { requestReminderPermission } from '@/lib/notifications';
import { useProgress, useSettings } from '@/store/progress';
import { Button, Card, EnergyBadge, Icon, ProgressBar, Screen, Text, radius, space, useColors, type IconName } from '@/ui';

const HOURS = [8, 12, 19, 21];

export default function ProfileScreen() {
  const colors = useColors();
  const t = useT();
  const uiLang = useLang();
  const { CARDS, EXERCISES, EXERCISE_BY_KEY, SUBJECTS: ALL_SUBJECTS, UNITS } = useContent();
  const SUBJECTS = useActiveSubjects();
  const chosen = useSettings((s) => s.subjects);
  const setSubjects = useSettings((s) => s.setSubjects);
  const placements = useSettings((s) => s.placements);
  const progress = useProgress((s) => s.progress);
  const reset = useProgress((s) => s.reset);
  const setProgress = useProgress((s) => s.setProgress);
  const lang = useSettings((s) => s.lang);
  const setLang = useSettings((s) => s.setLang);
  const hapticsOn = useSettings((s) => s.haptics);
  const setHaptics = useSettings((s) => s.setHaptics);
  const remindersOn = useSettings((s) => s.reminders);
  const setReminders = useSettings((s) => s.setReminders);
  const reminderHour = useSettings((s) => s.reminderHour);
  const setReminderHour = useSettings((s) => s.setReminderHour);
  const soundOn = useSettings((s) => s.sound);
  const setSound = useSettings((s) => s.setSound);
  const tick = useProgress((s) => s.tick);
  // Au retour sur l'onglet : nouvelle journée, énergie, boost à jour. Puis
  // toutes les 30 s tant qu'il reste affiché (minutes de boost, énergie).
  const [, setClock] = useState(0);
  useFocusEffect(
    useCallback(() => {
      tick();
      const id = setInterval(() => setClock((c) => c + 1), 30_000);
      return () => clearInterval(id);
    }, [tick]),
  );
  const [lastSubjectWarning, setLastSubjectWarning] = useState(false);
  useEffect(() => {
    if (!lastSubjectWarning) return;
    const id = setTimeout(() => setLastSubjectWarning(false), 3000);
    return () => clearTimeout(id);
  }, [lastSubjectWarning]);

  const now = new Date();
  const today = toDayKey(now);
  const level = levelProgress(progress.xp);
  const traits = allUnitTraits(progress, EXERCISES, CATALOG, today);
  const energyValue = currentEnergy(progress.energy, now);
  const boostLeft = boostMinutesLeft(progress.boost, now);
  // Achats : toujours une confirmation, puis on relit l'état le plus récent.
  const buy = (item: string, cost: number, apply: (p: typeof progress) => typeof progress | null) =>
    confirm(t('profile.shop.confirm.title'), t('profile.shop.confirm.body', { item, cost }), () => {
      const next = apply(useProgress.getState().progress);
      if (next) setProgress(next);
    });
  const crowns = Object.values(traits).reduce<number>((a, tr) => a + tr, 0);
  const queue = reviewQueueSize(progress, EXERCISE_BY_KEY);
  const deck = deckStats(progress.cards, CARDS.map((c) => c.id), today);
  const badgesEarned = Object.keys(progress.badges).length;
  const streakActive = isActiveToday(progress.streak, today);
  const atRisk = streakIsAtRisk(progress.streak, today);
  const shownStreak = displayedStreak(progress.streak, today);
  const gems = (cost: number) => `${cost} 💎`;

  return (
    <Screen>
      <Text variant="title">{t('profile.title')}</Text>

      <Card>
        <Text variant="h2">{t('common.level', { level: level.level })}</Text>
        <ProgressBar ratio={level.ratio} />
        <Text variant="small" secondary>
          {t('profile.level.detail', { xp: progress.xp, toNext: level.xpToNextLevel, next: level.level + 1 })}
        </Text>
      </Card>

      <View style={styles.grid}>
        <Tile icon={streakActive ? 'flame' : atRisk ? 'alert-circle' : 'flame-outline'} color={streakActive ? colors.streak : atRisk ? colors.danger : colors.textSecondary} value={`${shownStreak}`} label={t('profile.tile.streak', { best: progress.streak.best, count: shownStreak })} />
        <Tile icon="snow" color={colors.gem} value={`${progress.streak.freezes}`} label={t('profile.tile.freezes', { count: progress.streak.freezes })} />
        <Tile icon="trophy" color={colors.gold} value={`${crowns}`} label={t('profile.tile.crowns', { total: UNITS.length * 5, count: crowns })} />
        <Tile icon="albums" color={colors.success} value={`${deck.review}`} label={t('profile.tile.cards', { total: deck.total, count: deck.review })} />
      </View>

      {atRisk && (
        <Card color={colors.danger}>
          <Text variant="bodyBold">{t('profile.risk.title')}</Text>
          <Text variant="small" secondary>
            {t('profile.risk.body')}
          </Text>
        </Card>
      )}

      <Card>
        <View style={styles.row}>
          <Text variant="h2">{t('profile.shop')}</Text>
          <View style={styles.inline}>
            <Icon name="diamond" size={20} color={colors.gem} />
            <Text variant="h2">{progress.gems}</Text>
          </View>
        </View>
        <EnergyBadge energy={progress.energy} now={now} />
        <Button
          label={t('profile.shop.refill', { cost: gems(SHOP.refill.cost) })}
          tone="secondary"
          disabled={progress.gems < SHOP.refill.cost || energyValue >= 25}
          onPress={() => buy(t('profile.shop.item.refill'), SHOP.refill.cost, (p) => applyBuyRefill(p, new Date()))}
        />
        <Button
          label={t('profile.shop.freeze', { have: progress.streak.freezes, max: MAX_FREEZES, cost: gems(SHOP.freeze.cost) })}
          tone="secondary"
          disabled={progress.gems < SHOP.freeze.cost || progress.streak.freezes >= MAX_FREEZES}
          onPress={() => buy(t('profile.shop.item.freeze'), SHOP.freeze.cost, buyFreeze)}
        />
        <Button
          label={boostLeft > 0 ? t('profile.shop.boostActive', { minutes: boostLeft, cost: gems(SHOP.boost.cost) }) : t('profile.shop.boost', { minutes: SHOP.boost.minutes, cost: gems(SHOP.boost.cost) })}
          tone="secondary"
          disabled={progress.gems < SHOP.boost.cost}
          onPress={() => buy(t('profile.shop.item.boost'), SHOP.boost.cost, (p) => buyBoost(p, new Date()))}
        />
        <Text variant="small" secondary>
          {t('profile.shop.hint')}
        </Text>
      </Card>

      <Card>
        <Text variant="h2">{t('profile.training')}</Text>
        <Button label={queue > 0 ? t('profile.training.review', { count: queue }) : t('profile.training.none')} tone="secondary" disabled={queue === 0} onPress={() => router.push('/session/review')} />
        {SUBJECTS.map((s) => (
          <Button key={s.id} label={`${s.emoji} ${s.title}`} color={s.color} onPress={() => router.push({ pathname: '/session/free', params: { subjectId: s.id } })} />
        ))}
      </Card>

      <Card>
        <Text variant="h2">{t('profile.placement')}</Text>
        <Text variant="small" secondary>
          {t('profile.placement.hint')}
        </Text>
        {SUBJECTS.map((s) => (
          <Button
            key={`placement-${s.id}`}
            label={`${s.emoji} ${s.title}${placements[s.id] ? ` · ${placements[s.id].score}/${placements[s.id].total}` : ''}`}
            tone="secondary"
            onPress={() => router.push({ pathname: '/placement/[subjectId]', params: { subjectId: s.id } })}
          />
        ))}
      </Card>

      <Card>
        <View style={styles.inline}>
          <Icon name="timer" size={22} color={colors.streak} />
          <Text variant="h2">{t('profile.blitz')}</Text>
        </View>
        <Text variant="small" secondary>
          {t('profile.blitz.body')}
        </Text>
        {SUBJECTS.map((s) => (
          <Button
            key={s.id}
            label={`${s.emoji} ${s.title}${progress.blitz[s.id] ? ` · ${t('common.record', { value: progress.blitz[s.id] })}` : ''}`}
            tone="secondary"
            onPress={() => router.push({ pathname: '/session/blitz', params: { subjectId: s.id } })}
          />
        ))}
      </Card>

      <Card>
        <Text variant="h2">{t('profile.badges', { earned: badgesEarned, total: BADGES.length })}</Text>
        <View style={styles.badges}>
          {BADGES.map((b) => {
            const earned = progress.badges[b.id] !== undefined;
            return (
              <View key={b.id} style={[styles.badge, { backgroundColor: earned ? colors.goldSoft : colors.surfaceAlt, borderColor: earned ? colors.gold : colors.border, opacity: earned ? 1 : 0.6 }]}>
                <Icon name={earned ? 'medal' : 'lock-closed'} size={14} color={earned ? colors.gold : colors.textSecondary} />
                <Text variant="small">{t(`badge.${b.id}` as Key)}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text variant="h2">{t('profile.medals')}</Text>
        {progress.monthly.medals.length === 0 ? (
          <Text variant="small" secondary>
            {t('profile.medals.empty', { target: MONTHLY_TARGET })}
          </Text>
        ) : (
          <View style={styles.badges}>
            {progress.monthly.medals.map((m) => (
              <View key={m} style={[styles.badge, { backgroundColor: colors.goldSoft, borderColor: colors.gold }]}>
                <Icon name="medal" size={14} color={colors.gold} />
                <Text variant="small">{monthLabel(uiLang, m, true)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text variant="h2">{t('profile.settings')}</Text>

        <Text variant="bodyBold">{t('profile.subjects')}</Text>
        <View style={styles.choices}>
          {ALL_SUBJECTS.map((s) => {
            const active = !chosen || chosen.length === 0 || chosen.includes(s.id);
            return (
              <Button
                key={s.id}
                label={`${s.emoji} ${s.title}`}
                size="sm"
                tone={active ? 'primary' : 'secondary'}
                color={active ? s.color : undefined}
                style={styles.choice}
                onPress={() => {
                  const current = !chosen || chosen.length === 0 ? ALL_SUBJECTS.map((x) => x.id) : chosen;
                  const next = active ? current.filter((x) => x !== s.id) : [...current, s.id];
                  if (next.length === 0) {
                    setLastSubjectWarning(true);
                    return;
                  }
                  setSubjects(next.length === ALL_SUBJECTS.length ? null : next);
                }}
              />
            );
          })}
        </View>
        {lastSubjectWarning && (
          <Text variant="small" style={{ color: colors.danger }} accessibilityLiveRegion="polite">
            {t('profile.subjects.last')}
          </Text>
        )}
        <Text variant="small" secondary>
          {t('profile.subjects.hint')}
        </Text>

        <Text variant="bodyBold">{t('common.language')}</Text>
        <View style={styles.choices}>
          {LANGS.map((l) => (
            <Button key={l.id} label={`${l.flag} ${l.label}`} size="sm" tone={l.id === lang ? 'primary' : 'secondary'} style={styles.choice} onPress={() => setLang(l.id)} />
          ))}
        </View>

        <Text variant="bodyBold">{t('profile.settings.goal')}</Text>
        <View style={styles.choices}>
          {DAILY_GOALS.map((g) => (
            <Button key={g} label={`${g}`} size="sm" tone={g === progress.daily.goal ? 'primary' : 'secondary'} style={styles.choice} onPress={() => setProgress(applySetDailyGoal(progress, g))} />
          ))}
        </View>

        <View style={styles.row}>
          <Text variant="body">{t('profile.settings.sound')}</Text>
          <Switch value={soundOn} onValueChange={setSound} trackColor={{ true: colors.success }} />
        </View>
        <View style={styles.row}>
          <Text variant="body">{t('profile.settings.haptics')}</Text>
          <Switch value={hapticsOn} onValueChange={setHaptics} trackColor={{ true: colors.success }} />
        </View>
        <View style={styles.row}>
          <Text variant="body" style={styles.grow}>
            {t('profile.settings.reminders')}
          </Text>
          <Switch
            value={remindersOn}
            // Sur le web il n'y a pas de rappels (voir la note dessous).
            disabled={Platform.OS === 'web'}
            trackColor={{ true: colors.success }}
            onValueChange={async (on) => {
              if (on && !(await requestReminderPermission())) {
                setReminders(false);
                // Refus déjà donné : Android ne redemande plus, il faut passer par les réglages.
                Alert.alert(t('profile.reminders.denied.title'), t('profile.reminders.denied.body'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('common.openSettings'), onPress: () => void Linking.openSettings().catch(() => undefined) },
                ]);
                return;
              }
              setReminders(on);
            }}
          />
        </View>
        {remindersOn && (
          <>
            <Text variant="small" secondary>
              {t('profile.settings.reminderHour', { hour: reminderHour })}
            </Text>
            <View style={styles.choices}>
              {HOURS.map((h) => (
                <Button key={h} label={t('common.clock', { hour: h })} size="sm" tone={h === reminderHour ? 'primary' : 'secondary'} style={styles.choice} onPress={() => setReminderHour(h)} />
              ))}
            </View>
          </>
        )}
        <Text variant="small" secondary>
          {t('profile.settings.remindersNote')}
        </Text>
        {/* Relecture de l'intro : les réglages actuels y sont repris, et « retour » ramène ici sans rien changer. */}
        <Button label={t('profile.settings.intro')} tone="secondary" onPress={() => router.push({ pathname: '/onboarding', params: { replay: '1' } })} />
        <Button label={t('profile.settings.privacy')} tone="secondary" onPress={() => router.push('/privacy')} />
        <Button label={t('profile.settings.reset')} tone="danger" onPress={() =>
            confirm(t('profile.reset.title'), t('profile.reset.body'), () => {
              reset();
              // Les scores des tests de niveau partent avec la progression.
              useSettings.setState({ placements: {} });
            })
          }
        />
      </Card>

      <Text variant="small" secondary style={styles.footer}>
        {t('profile.footer', { units: UNITS.length, exercises: EXERCISES.length, cards: CARDS.length })}
      </Text>
    </Screen>
  );
}

function Tile({ icon, color, value, label }: { icon: IconName; color: string; value: string; label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.inline}>
        <Icon name={icon} size={20} color={color} />
        <Text variant="h2">{value}</Text>
      </View>
      <Text variant="small" secondary>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48%', flexGrow: 1, borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grow: { flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { flexGrow: 1, minWidth: 64 },
  footer: { textAlign: 'center', paddingBottom: space.xl },
});
