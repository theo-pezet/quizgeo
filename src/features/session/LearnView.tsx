import { StyleSheet, View } from 'react-native';

import type { Card } from '@/content';
import { useT } from '@/i18n';
import { looksLikeCode } from '@/lib/code';
import { Text, radius, space, tint, useColors } from '@/ui';

/**
 * Fiche « New » : la notion et son exemple, à lire (et écouter) avant les
 * questions qui l'utilisent. Effet de l'exemple résolu : un débutant apprend
 * mieux d'une notion expliquée que d'une question posée à froid.
 */
export function LearnView({ card, color }: { card: Card; color: string }) {
  const colors = useColors();
  const t = useT();
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: tint(color, 0.85) }]}>
        <Text variant="small" style={[styles.pillText, { color }]}>
          {t('learn.tag')}
        </Text>
      </View>
      <Text variant="title">{card.term}</Text>
      <Text variant="body" style={styles.definition}>
        {card.definition}
      </Text>
      {card.example ? (
        <View style={[styles.example, { backgroundColor: colors.surfaceAlt, borderLeftColor: color }]}>
          <Text variant="small" style={[styles.pillText, { color }]}>
            {t('learn.example')}
          </Text>
          <Text variant={looksLikeCode(card.example) ? 'mono' : 'body'} style={styles.definition}>
            {card.example}
          </Text>
        </View>
      ) : null}
      <Text variant="small" secondary>
        {t('learn.hint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  pillText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  definition: { lineHeight: 24 },
  example: { borderLeftWidth: 3, borderRadius: radius.sm, padding: space.md, gap: space.xs },
});
