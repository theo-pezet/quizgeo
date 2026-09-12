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
import { useProgress } from '@/store/progress';
import { Button, Card, Screen, Text, radius, space, useColors } from '@/ui';

const TIER_EMOJI = ['🥉', '🥈', '🥇', '💠', '❤️‍🔥', '💚', '💜', '🤍', '🖤', '💎'];

export default function LeagueScreen() {
  const colors = useColors();
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
  const zone = rank <= PROMOTION_ZONE ? 'promotion' : rank > LEAGUE_SIZE - DEMOTION_ZONE ? 'relégation' : 'maintien';

  return (
    <Screen>
      <Text variant="title">
        {TIER_EMOJI[tier]} Ligue {LEAGUE_TIERS[tier]}
      </Text>
      <Text variant="small" secondary>
        {daysLeft > 0 ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} avant le classement final · ` : 'Classement final · '}
        les {PROMOTION_ZONE} premiers montent, les {DEMOTION_ZONE} derniers descendent.
      </Text>

      {outcome && (
        <Card style={{ borderColor: outcome.result === 'promoted' ? colors.success : outcome.result === 'demoted' ? colors.danger : colors.border }}>
          <Text variant="bodyBold">
            {outcome.result === 'promoted' ? '🎉 Promu·e !' : outcome.result === 'demoted' ? '📉 Relégué·e' : '🤝 Maintenu·e'}
          </Text>
          <Text variant="small" secondary>
            Semaine du {outcome.weekKey} : {outcome.rank}ᵉ en ligue {LEAGUE_TIERS[outcome.tier]}
            {outcome.result !== 'stayed' ? ` → ligue ${LEAGUE_TIERS[outcome.newTier]}` : ''}.
          </Text>
          <Button label="OK" tone="secondary" onPress={() => setProgress(applyLeagueOutcomeSeen(progress))} />
        </Card>
      )}

      <Card>
        <View style={styles.me}>
          <Text variant="h2">{rank}ᵉ / {LEAGUE_SIZE}</Text>
          <Text variant="bodyBold">{progress.league.xpThisWeek} XP cette semaine</Text>
        </View>
        <Text variant="small" style={{ color: zone === 'promotion' ? colors.success : zone === 'relégation' ? colors.danger : colors.textSecondary }}>
          {zone === 'promotion' ? '↑ Zone de promotion' : zone === 'relégation' ? '↓ Zone de relégation' : '— Zone de maintien'}
          {tier === LEAGUE_TIERS.length - 1 && zone === 'promotion' ? ' (division maximale)' : ''}
        </Text>
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
              <Text variant={c.isUser || c.rival ? 'bodyBold' : 'body'} style={styles.name}>
                {c.rival ? '⚔️ ' : ''}
                {c.name}
              </Text>
              <Text variant="small" secondary>
                {c.xp} XP
              </Text>
            </View>
          );
        })}
      </View>

      <Text variant="small" secondary style={styles.note}>
        ⚔️ Tes trois rivaux te suivent de semaine en semaine. Ligue hors ligne : les adversaires sont simulés.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  list: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: space.md },
  pos: { width: 24, textAlign: 'right', fontWeight: '700' },
  name: { flex: 1 },
  note: { textAlign: 'center', paddingVertical: space.md },
});
