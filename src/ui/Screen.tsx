import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useColors } from './tokens';

/**
 * Fond, zone sûre et largeur maximale (l'app est aussi un site web).
 * `overlay` est rendu PAR-DESSUS le contenu, hors du défilement : c'est là
 * que vont les feuilles ancrées en bas de l'écran. `footer` est une barre
 * fixe en bas (bouton « Continuer »), au-dessus de la barre Android.
 * `footerBackground` / `footerBorder` la colorent (panneau juste / faux).
 */
export function Screen({
  children,
  scroll = true,
  style,
  overlay,
  footer,
  background,
  footerBackground,
  footerBorder,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  overlay?: ReactNode;
  footer?: ReactNode;
  background?: string;
  footerBackground?: string;
  footerBorder?: string;
}>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inner = <View style={[styles.inner, style]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background ?? colors.background }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, footer ? styles.withFooter : { paddingBottom: insets.bottom + space.md }]} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, footer ? null : { paddingBottom: insets.bottom }]}>{inner}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, space.md),
              backgroundColor: footerBackground ?? background ?? colors.background,
              borderTopColor: footerBorder ?? colors.border,
              borderTopWidth: footerBorder ? 2 : 1,
            },
          ]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
      {overlay ? (
        <View pointerEvents="box-none" style={[styles.overlay, { paddingBottom: insets.bottom }]}>
          <View pointerEvents="box-none" style={styles.overlayInner}>{overlay}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  withFooter: { paddingBottom: space.md },
  inner: { width: '100%', maxWidth: 560, flex: 1, padding: space.lg, gap: space.lg },
  footer: { alignItems: 'center', paddingTop: space.md, borderTopWidth: 1 },
  footerInner: { width: '100%', maxWidth: 560, paddingHorizontal: space.lg },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  overlayInner: { width: '100%', maxWidth: 560, padding: space.lg },
});
