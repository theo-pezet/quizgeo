import { StyleSheet, View } from 'react-native';

import { questLabel, type Quest } from '@/game';

import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';
import { space, useColors } from './tokens';

export function QuestsCard({ quests }: { quests: Quest[] }) {
  const colors = useColors();
  const done = quests.filter((q) => q.done).length;
  return (
    <Card>
      <View style={styles.head}>
        <Text variant="bodyBold">🎯 Quêtes du jour</Text>
        <Text variant="small" secondary>
          {done}/{quests.length}
        </Text>
      </View>
      {quests.map((q) => (
        <View key={q.id} style={styles.quest}>
          <View style={styles.line}>
            <Text variant="small" style={[styles.label, q.done && styles.done]}>
              {q.done ? '✅ ' : ''}
              {questLabel(q)}
            </Text>
            <Text variant="small" style={{ color: colors.primary }}>
              💎 {q.reward}
            </Text>
          </View>
          <ProgressBar ratio={q.progress / q.target} height={6} color={q.done ? colors.success : colors.primary} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quest: { gap: space.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  label: { flex: 1 },
  done: { textDecorationLine: 'line-through', opacity: 0.7 },
});
