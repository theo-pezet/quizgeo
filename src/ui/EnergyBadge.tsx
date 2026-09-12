import { StyleSheet, View } from 'react-native';

import { MAX_ENERGY, currentEnergy, minutesToNextEnergy, type EnergyState } from '@/game';

import { Text } from './Text';
import { useColors } from './tokens';

/** ⚡ 18/25 · +1 dans 7 min */
export function EnergyBadge({ energy, now, compact = false }: { energy: EnergyState; now: Date; compact?: boolean }) {
  const colors = useColors();
  const value = currentEnergy(energy, now);
  const next = minutesToNextEnergy(energy, now);
  return (
    <View style={styles.row}>
      <Text variant="bodyBold" style={{ color: value < 5 ? colors.danger : colors.text }}>
        ⚡ {value}/{MAX_ENERGY}
      </Text>
      {!compact && next > 0 && (
        <Text variant="small" secondary>
          +1 dans {next} min
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 } });
