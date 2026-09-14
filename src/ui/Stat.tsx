import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { space } from './tokens';

/** Une petite statistique en tête d'écran : icône colorée + valeur. */
export function Stat({ icon, color, value, label }: { icon: IconName; color: string; value: string | number; label?: string }) {
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="bodyBold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.xs } });
