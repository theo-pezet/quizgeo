import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, space, useColors } from './tokens';

/** Une carte à bordure franche, sans ombre : lisible en clair comme en sombre. */
export function Card({ children, style, color }: PropsWithChildren<{ style?: ViewStyle; color?: string }>) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: color ?? colors.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 2, padding: space.lg, gap: space.sm },
});
