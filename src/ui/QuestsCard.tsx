import { StyleSheet, View } from 'react-native';

import type { Quest } from '@/game';
import { useT, type Key } from '@/i18n';

import { Card } from './Card';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { space, useColors } from './tokens';

const QUEST_KEYS: Record<Quest['kind'], Key> = {
  xp: 'quest.xp',
  lessons: 'quest.lessons',
  perfect: 'quest.perfect',
  combo: 'quest.combo',
  cards: 'quest.cards',
  recover: 'quest.recover',
};

export function questText(t: ReturnType<typeof useT>, q: Quest): string {
  return t(QUEST_KEYS[q.kind], { n: q.target });
}

export function QuestsCard({ quests }: { quests: Quest[] }) {
  const colors = useColors();
  const t = useT();
  const done = quests.filter((q) => q.done).length;
  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.title}>
          <Icon name="flag" size={18} color={colors.primary} />
          <Text variant="bodyBold">{t('quests.title')}</Text>
        </View>
        <Text variant="small" secondary>
          {done}/{quests.length}
        </Text>
      </View>
      {quests.map((q) => (
        <View key={q.id} style={styles.quest}>
          <View style={styles.line}>
            <Text variant="small" style={[styles.label, q.done && styles.done]}>
              {questText(t, q)}
            </Text>
            <View style={styles.reward}>
              <Icon name="diamond" size={13} color={colors.gem} />
              <Text variant="small" style={{ color: colors.gem }}>
                {q.reward}
              </Text>
            </View>
          </View>
          <ProgressBar ratio={q.progress / q.target} height={8} color={q.done ? colors.success : colors.primary} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quest: { gap: space.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  label: { flex: 1 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  done: { textDecorationLine: 'line-through', opacity: 0.7 },
});
