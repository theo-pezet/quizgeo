import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useColors } from './tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Icônes vectorielles (Ionicons, livrées avec Expo) : un seul style dans toute l'app. */
export function Icon({ name, size = 18, color }: { name: IconName; size?: number; color?: string }) {
  const colors = useColors();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}
