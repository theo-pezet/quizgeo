/**
 * Les jetons de design : couleurs (clair / sombre), espacements, rayons,
 * typographie. Tout composant lit ici, jamais une valeur en dur.
 *
 * Identité : fond crème, encre profonde, une police ronde (Nunito) et des
 * boutons à relief. Les couleurs vives sont réservées aux matières et aux
 * mondes, pour que le parcours change de visage à mesure qu'on avance.
 */

import { Platform, useColorScheme } from 'react-native';

export interface Colors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  gold: string;
  goldSoft: string;
  locked: string;
  streak: string;
  energy: string;
  gem: string;
}

export const palette: Record<'light' | 'dark', Colors> = {
  light: {
    background: '#FBF8F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EEE4',
    border: '#E6DFD2',
    borderStrong: '#D5CCBB',
    text: '#1F1B2E',
    textSecondary: '#6F6A7E',
    primary: '#2E2A6B',
    primaryText: '#FFFFFF',
    success: '#1FA463',
    successSoft: '#DDF6E8',
    danger: '#E2445C',
    dangerSoft: '#FCE3E8',
    gold: '#F2B705',
    goldSoft: '#FFF3C4',
    locked: '#CFC8BC',
    streak: '#FF7A1A',
    energy: '#F2B705',
    gem: '#2AA9E0',
  },
  dark: {
    background: '#14131C',
    surface: '#1E1D29',
    surfaceAlt: '#29283A',
    border: '#37364A',
    borderStrong: '#45445C',
    text: '#F3F1EA',
    textSecondary: '#A6A3B5',
    primary: '#9C93FF',
    primaryText: '#14131C',
    success: '#3DD68C',
    successSoft: '#123B27',
    danger: '#FF6B84',
    dangerSoft: '#4A1C27',
    gold: '#FFC933',
    goldSoft: '#3E3410',
    locked: '#3B3A4E',
    streak: '#FF8C3A',
    energy: '#FFC933',
    gem: '#5CC2F0',
  },
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

/** Une teinte plus sombre de la même couleur, pour le relief des boutons. */
export function shade(hex: string, amount = 0.22): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Une teinte claire (mélange avec du blanc), pour les fonds de bannière. */
export function tint(hex: string, amount = 0.85): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v + (255 - v) * amount);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 } as const;

export const fonts = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const font = {
  title: { fontSize: 26, fontFamily: fonts.black, letterSpacing: -0.3, lineHeight: 32 },
  h2: { fontSize: 20, fontFamily: fonts.extraBold, lineHeight: 26 },
  body: { fontSize: 16, fontFamily: fonts.regular, lineHeight: 23 },
  bodyBold: { fontSize: 16, fontFamily: fonts.extraBold, lineHeight: 22 },
  small: { fontSize: 13, fontFamily: fonts.bold, lineHeight: 18 },
  mono: { fontSize: 14, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Menlo, Consolas, monospace' }), lineHeight: 20 },
};
