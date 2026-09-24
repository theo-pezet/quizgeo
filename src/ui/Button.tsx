import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fonts, radius, shade, space, useColors } from './tokens';

export type ButtonTone = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  style?: ViewStyle;
  /** Couleur de fond (ton `primary`) : la matière ou le monde en cours. */
  color?: string;
  size?: 'md' | 'sm';
  icon?: React.ReactNode;
}

const LIFT = 4;

/**
 * Bouton à relief : une bordure basse plus sombre qui s'écrase à l'appui.
 * La hauteur totale ne bouge pas (la marge compense), donc rien ne saute.
 */
export function Button({ label, onPress, tone = 'primary', disabled, style, color, size = 'md', icon }: Props) {
  const colors = useColors();
  const bg = {
    primary: color ?? colors.primary,
    secondary: colors.surfaceAlt,
    success: colors.success,
    danger: colors.danger,
    ghost: 'transparent',
    outline: colors.surface,
  }[tone];
  const fg = {
    primary: color ? '#FFFFFF' : colors.primaryText,
    secondary: colors.text,
    success: '#FFFFFF',
    danger: '#FFFFFF',
    ghost: colors.textSecondary,
    outline: colors.text,
  }[tone];
  const edge = tone === 'ghost' ? 'transparent' : tone === 'secondary' ? colors.borderStrong : tone === 'outline' ? colors.borderStrong : shade(bg);
  // Le bouton « fantôme » garde une bordure basse transparente : même hauteur
  // et même ligne de texte que ses voisins à relief (pied d'écran « Retour · Continuer »).
  const flat = tone === 'ghost';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        {
          backgroundColor: bg,
          borderBottomColor: edge,
          borderBottomWidth: flat ? LIFT : pressed ? 0 : LIFT,
          marginTop: flat ? 0 : pressed ? LIFT : 0,
          opacity: disabled ? 0.45 : 1,
        },
        tone === 'outline' && { borderWidth: 2, borderColor: colors.borderStrong, borderBottomWidth: pressed ? 2 : LIFT },
        style,
      ]}>
      <View style={styles.inner}>
        {icon}
        <Text numberOfLines={2} style={[styles.label, size === 'sm' && styles.labelSm, { color: fg }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 44 px visibles + hitSlop : au moins 48 dp de zone tactile.
  sm: { paddingVertical: 8, paddingHorizontal: space.md, borderRadius: radius.sm, minHeight: 44 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  // Deux lignes au plus : un prix ou un score ne disparaît plus derrière « … ».
  label: { fontSize: 16, lineHeight: 21, fontFamily: fonts.extraBold, letterSpacing: 0.3, textAlign: 'center', flexShrink: 1 },
  labelSm: { fontSize: 14, lineHeight: 19 },
});
