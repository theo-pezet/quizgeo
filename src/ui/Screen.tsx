import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useColors } from './tokens';

/**
 * Fond, zone sûre et largeur maximale (l'app est aussi un site web).
 * `overlay` est rendu PAR-DESSUS le contenu, hors du défilement : c'est là
 * que vont les feuilles ancrées en bas de l'écran.
 */
export function Screen({
  children,
  scroll = true,
  style,
  overlay,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle; overlay?: ReactNode }>) {
  const colors = useColors();
  const inner = <View style={[styles.inner, style]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>{inner}</View>
      )}
      {overlay ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <View pointerEvents="box-none" style={styles.overlayInner}>{overlay}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 560, flex: 1, padding: space.lg, gap: space.lg },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  overlayInner: { width: '100%', maxWidth: 560, padding: space.lg },
});
