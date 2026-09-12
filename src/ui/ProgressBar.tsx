import { StyleSheet, View } from 'react-native';

import { radius, useColors } from './tokens';

export function ProgressBar({ ratio, color, height = 10 }: { ratio: number; color?: string; height?: number }) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt, height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%' },
});
