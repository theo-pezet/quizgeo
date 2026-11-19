import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useT } from '@/i18n';
import { speak, stopSpeaking } from '@/lib/speech';

import { Icon } from './Icon';
import { Text } from './Text';
import { space, useColors } from './tokens';

/** Bouton haut-parleur : lit `text` à voix haute, ou s'arrête si la lecture est en cours. */
export function ListenButton({ text, color, label, center = false }: { text: string; color?: string; label?: string; center?: boolean }) {
  const colors = useColors();
  const t = useT();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const tone = color ?? colors.textSecondary;
  const toggle = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speak(text, () => setPlaying(false));
  };
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={playing ? t('listen.stop') : t('listen.play')}
      style={[styles.btn, center && styles.center, { borderColor: tone }]}>
      <Icon name={playing ? 'stop' : 'volume-high'} size={16} color={tone} />
      {label !== undefined && (
        <Text variant="small" style={{ color: tone, fontWeight: '700' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 2, borderRadius: 999, paddingVertical: 4, paddingHorizontal: space.sm },
  center: { alignSelf: 'center' },
});
