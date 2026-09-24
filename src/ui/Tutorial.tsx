import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useT, type Key } from '@/i18n';

import { Button } from './Button';
import { FadeUp } from './anim';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { radius, space, tint, useColors } from './tokens';

const STEPS: { icon: IconName; color: (c: ReturnType<typeof useColors>) => string }[] = [
  { icon: 'map', color: (c) => c.primary },
  { icon: 'flash', color: (c) => c.energy },
  { icon: 'flag', color: (c) => c.success },
  { icon: 'trophy', color: (c) => c.gold },
];

/**
 * Le mini-tuto du parcours : quatre cartes en surimpression, une idée par
 * carte (parcours, énergie, objectif et quêtes, couronnes). Se joue une fois.
 * Un voile couvre l'écran : on ne peut pas toucher le parcours derrière (ce
 * qui démontait le tuto et le faisait repartir à l'étape 1). « Passer » le
 * termine d'un coup.
 */
export function Tutorial({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const t = useT();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];
  const color = current.color(colors);
  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]} pointerEvents="auto" accessibilityViewIsModal>
      <FadeUp key={step} style={styles.wrap}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: color }]}>
          <View style={styles.head}>
            <View style={[styles.halo, { backgroundColor: tint(color, 0.82) }]}>
              <Icon name={current.icon} size={26} color={color} />
            </View>
            <View style={styles.grow}>
              <Text variant="small" secondary>
                {step + 1} / {STEPS.length}
              </Text>
              <Text variant="h2">{t(`tutorial.${step + 1}.title` as Key)}</Text>
            </View>
          </View>
          <Text variant="body">{t(`tutorial.${step + 1}.body` as Key)}</Text>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === step ? color : colors.border }]} />
            ))}
          </View>
          <View style={styles.actions}>
            {!last && <Button label={t('tutorial.skip')} tone="ghost" onPress={onDone} />}
            <Button label={last ? t('tutorial.done') : t('tutorial.next')} color={color} style={styles.grow} onPress={() => (last ? onDone() : setStep(step + 1))} />
          </View>
        </View>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(10, 8, 20, 0.45)', justifyContent: 'flex-end', alignItems: 'center', padding: space.lg, zIndex: 10 },
  wrap: { width: '100%', maxWidth: 528 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: { borderWidth: 2, borderRadius: radius.lg, padding: space.lg, gap: space.md, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  halo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
