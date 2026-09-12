/**
 * Les jetons de design : couleurs (clair / sombre), espacements, rayons,
 * typographie. Tout composant lit ici, jamais une valeur en dur.
 */

import { useColorScheme } from 'react-native';

export interface Colors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  gold: string;
  locked: string;
}

export const palette: Record<'light' | 'dark', Colors> = {
  light: {
    background: '#F6F5FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEDF6',
    border: '#E2E0EE',
    text: '#17162B',
    textSecondary: '#6B6A85',
    primary: '#5B4BFF',
    primaryText: '#FFFFFF',
    success: '#1FA463',
    successSoft: '#DDF6E8',
    danger: '#E2445C',
    dangerSoft: '#FCE3E8',
    gold: '#F5B301',
    locked: '#C9C7D6',
  },
  dark: {
    background: '#0F1017',
    surface: '#1A1B26',
    surfaceAlt: '#232435',
    border: '#2E2F44',
    text: '#F2F1FA',
    textSecondary: '#A09FB8',
    primary: '#8A7DFF',
    primaryText: '#0F1017',
    success: '#3DD68C',
    successSoft: '#123B27',
    danger: '#FF6B84',
    dangerSoft: '#4A1C27',
    gold: '#FFC933',
    locked: '#3B3C50',
  },
};

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const font = {
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23 },
  bodyBold: { fontSize: 16, fontWeight: '700' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  mono: { fontSize: 14, fontFamily: 'Menlo', lineHeight: 20 },
};
