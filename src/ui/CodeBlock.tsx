import { StyleSheet, Text, View } from 'react-native';

import type { CodeBlock as CodeBlockType } from '@/game';
import { useT } from '@/i18n';

import { font, radius, space, useColors } from './tokens';

/** Un extrait de code ; `output`, quand il est donné, révèle la sortie réelle en dessous. */
export function CodeBlock({ code, output }: { code: CodeBlockType; output?: string }) {
  const colors = useColors();
  const t = useT();
  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={[styles.lang, { color: colors.textSecondary }]}>{code.lang}</Text>
      <Text style={[font.mono, { color: colors.text }]} selectable>
        {code.src}
      </Text>
      {output !== undefined && (
        <View style={[styles.out, { borderTopColor: colors.border }]}>
          <Text style={[styles.lang, { color: colors.success }]}>{'>'} {t('session.code.output')}</Text>
          <Text style={[font.mono, { color: colors.success }]} selectable>
            {output}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.xs },
  lang: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  out: { borderTopWidth: 1, paddingTop: space.xs, marginTop: space.xs, gap: 2 },
});
