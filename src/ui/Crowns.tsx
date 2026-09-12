import { StyleSheet, Text, View } from 'react-native';

import type { Traits } from '@/game';

import { useColors } from './tokens';

/** Les trois couronnes d'une unité. */
export function Crowns({ count, size = 14 }: { count: Traits; size?: number }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ fontSize: size, opacity: i < count ? 1 : 0.25, color: colors.gold }}>
          👑
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
