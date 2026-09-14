import { StyleSheet, Text, View } from 'react-native';

import type { Traits } from '@/game';

import { useColors } from './tokens';

/**
 * Les cinq couronnes d'une unité. `cracked` : des couronnes ont été perdues
 * faute de révision ; on les montre fissurées pour inviter à revenir.
 */
export function Crowns({ count, size = 14, cracked = 0 }: { count: Traits; size?: number; cracked?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { gap: Math.max(2, size / 6) }]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const earned = i < count;
        const lost = !earned && i < count + cracked;
        return (
          <Text key={i} style={{ fontSize: size, lineHeight: size * 1.3, opacity: earned ? 1 : lost ? 0.7 : 0.22, color: colors.gold }}>
            {lost ? '💔' : '👑'}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' } });
