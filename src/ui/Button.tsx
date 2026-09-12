import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { radius, space, useColors } from './tokens';

export type ButtonTone = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  style?: ViewStyle;
  color?: string;
}

export function Button({ label, onPress, tone = 'primary', disabled, style, color }: Props) {
  const colors = useColors();
  const bg = {
    primary: color ?? colors.primary,
    secondary: colors.surfaceAlt,
    success: colors.success,
    danger: colors.danger,
    ghost: 'transparent',
  }[tone];
  const fg = {
    primary: '#FFFFFF',
    secondary: colors.text,
    success: '#FFFFFF',
    danger: '#FFFFFF',
    ghost: colors.textSecondary,
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
