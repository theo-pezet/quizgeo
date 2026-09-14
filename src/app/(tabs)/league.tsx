import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  DEMOTION_ZONE,
  LEAGUE_SIZE,
  LEAGUE_TIERS,
  PROMOTION_ZONE,
  applyLeagueOutcomeSeen,
  dayFractionOf,
  daysLeftInWeek,
  leagueStandings,
  toDayKey,
} from '@/game';
import { useT, type Key } from '@/i18n';
import { useProgress } from '@/store/progress';
import { Button, Card, Icon, Screen, Text, radius, space, useColors } from '@/ui';

const TIER_EMOJI = ['🥉', '🥈', '🥇', '💠', '❤️‍🔥', '💚', '💜', '🤍', '🖤', '💎'];

export default function LeagueScreen() {
  const colors = useColors();
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const setProgress = useProgress((s) => s.setProgress);
  const tick = useProgress((s) => s.tick);
  useFocusEffect(useCallback(() => tick(), [tick]));

  const now = new Date();
  const today = toDayKey(now);
  const fraction = dayFractionOf(now);
  const standings = useMemo(() => leagueStandings(progress.league, today, fraction), [progress.league, today, fraction]);
  const rank = standings.findIndex((c) => c.isUser) + 1;
  const daysLeft = daysLeftInWeek(progress.league, today);
  const tier = progress.league.tier;
  const outcome = progress.league.pendingOutcome;
  const zone = rank <= PROMOTION_ZONE ? 'promotion' : rank > LEAGUE_SIZE - DEMOTION_ZONE ? 'demotion' : 'stay';
  const tierName = (i: number) => t(`league.tier.${i}` as Key);
  const zoneColor = zone === 'promotion' ? colors.success : zone === 'demotion' ? colors.danger : colors.textSecondary;

  return (
    <Screen>
      <Text variant="title">
        {TIER_EMOJI[tier]} {t('league.title', { tier: tierName(tier) })}
      </Text>
      <Text variant="small" secondary>
        {daysLeft > 0 ? t('league.daysLeft', { count: daysLeft }) : t('league.final')} · {t('league.rules', { up: PROMOTION_ZONE, down: DEMOTION_ZONE })}
      </Text>

      {outcome && (
        <Card color={outcome.result === 'promoted' ? colors.success : outcome.result === 'demoted' ? colors.danger : colors.border}>
          <Text variant="bodyBold">
            {outcome.result === 'promoted' ? t('league.promoted') : outcome.result === 'demoted' ? t('league.demoted') : t('league.stayed')}
          </Text>
          <Text variant="small" secondary>
            {t('league.outcome', { week: outcome.weekKey, rank: outcome.rank, tier: tierName(outcome.tier) })}
            {outcome.result !== 'stayed' ? t('league.outcomeTo', { tier: tierName(outcome.newTier) }) : ''}.
          </Text>
          <Button label={t('common.ok')} tone="secondary" onPress={() => setProgress(applyLeagueOutcomeSeen(progress))} />
        </Card>
      )}

      <Card>
        <View style={styles.me}>
          <Text variant="h2">{t('league.rank', { rank, size: LEAGUE_SIZE })}</Text>
          <Text variant="bodyBold">{t('league.weekXp', { xp: progress.league.xpThisWeek })}</Text>
        </View>
        <View style={styles.zone}>
          <Icon name={zone === 'promotion' ? 'arrow-up-circle' : zone === 'demotion' ? 'arrow-down-circle' : 'remove-circle'} size={18} color={zoneColor} />
          <Text variant="small" style={{ color: zoneColor }}>
            {t(`league.zone.${zone}`)}
            {tier === LEAGUE_TIERS.length - 1 && zone === 'promotion' ? ` ${t('league.maxTier')}` : ''}
          </Text>
        </View>
      </Card>

      <View style={styles.list}>
        {standings.map((c, i) => {
          const pos = i + 1;
          const promo = pos <= PROMOTION_ZONE;
          const demo = pos > LEAGUE_SIZE - DEMOTION_ZONE;
          return (
            <View
              key={c.name}
              style={[
                styles.row,
                { backgroundColor: c.isUser ? colors.surfaceAlt : colors.surface, borderColor: c.isUser ? colors.primary : colors.border },
              ]}>
              <Text variant="small" style={[styles.pos, { color: promo ? colors.success : demo ? colors.danger : colors.textSecondary }]}>
                {pos}
              </Text>
              {c.rival && <Icon name="flash" size={14} color={colors.streak} />}
              <Text variant={c.isUser || c.rival ? 'bodyBold' : 'body'} style={styles.name}>
                {c.isUser ? t('league.you') : c.name}
              </Text>
              <Text variant="small" secondary>
                {c.xp} XP
              </Text>
            </View>
          );
        })}
      </View>

      <Text variant="small" secondary style={styles.note}>
        {t('league.note')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  zone: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  list: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 2, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: space.md },
  pos: { width: 24, textAlign: 'right' },
  name: { flex: 1 },
  note: { textAlign: 'center', paddingVertical: space.md },
});
