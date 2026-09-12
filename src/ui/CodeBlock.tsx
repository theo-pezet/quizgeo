import { StyleSheet, Text, View } from 'react-native';

import type { CodeBlock as CodeBlockType } from '@/game';

import { font, radius, space, useColors } from './tokens';

export function CodeBlock({ code }: { code: CodeBlockType }) {
  const colors = useColors();
  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.lang, { color: colors.textSecondary }]}>{code.lang}</Text>
      <Text style={[font.mono, { color: colors.text }]} selectable>
        {code.src}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.xs },
  lang: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});
