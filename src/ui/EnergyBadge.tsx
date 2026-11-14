import { StyleSheet, View } from 'react-native';

import { MAX_ENERGY, currentEnergy, minutesToNextEnergy, type EnergyState } from '@/game';
import { useT } from '@/i18n';

import { Icon } from './Icon';
import { Text } from './Text';
import { useColors } from './tokens';

/** ⚡ 18/30 · +1 dans 7 min. `max` : plafond du joueur (bonus de ligue compris). */
export function EnergyBadge({ energy, now, max = MAX_ENERGY, compact = false }: { energy: EnergyState; now: Date; max?: number; compact?: boolean }) {
  const colors = useColors();
  const t = useT();
  const value = currentEnergy(energy, now, max);
  const next = minutesToNextEnergy(energy, now, max);
  const color = value < 5 ? colors.danger : colors.energy;
  return (
    <View style={styles.row}>
      <Icon name="flash" size={18} color={color} />
      <Text variant="bodyBold" style={{ color: value < 5 ? colors.danger : colors.text }}>
        {value}/{max}
      </Text>
      {!compact && next > 0 && (
        <Text variant="small" secondary>
          {t('energy.next', { minutes: next })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
