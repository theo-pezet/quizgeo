import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FEATURES } from '@/config/features';
import { SHOP, applyBuyRefill, currentEnergy, minutesToLesson } from '@/game';
import { useProgress } from '@/store/progress';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';
import { space, useColors } from './tokens';

/**
 * Plus d'énergie : attendre, recharger, ou réviser gratuitement. Une pub
 * récompensée s'ajoutera ici quand le SDK existera (FEATURES.ads).
 */
export function NoEnergySheet({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const progress = useProgress((s) => s.progress);
  const setProgress = useProgress((s) => s.setProgress);
  const now = new Date();
  const value = currentEnergy(progress.energy, now);
  const wait = minutesToLesson(progress.energy, now);
  const canPay = progress.gems >= SHOP.refill.cost;

  return (
    <Card style={{ borderColor: colors.danger }}>
      <Text variant="h2">⚡ Plus assez d’énergie</Text>
      <Text variant="small" secondary>
        Il te reste {value} point{value > 1 ? 's' : ''} ; une leçon en coûte 5. Prochaine leçon possible dans{' '}
        {wait >= 60 ? `${Math.floor(wait / 60)} h ${wait % 60} min` : `${wait} min`}.
      </Text>
      <View style={styles.actions}>
        <Button
          label={`Recharger (💎 ${SHOP.refill.cost})${canPay ? '' : ` · il te manque ${SHOP.refill.cost - progress.gems}`}`}
          disabled={!canPay}
          onPress={() => {
            const next = applyBuyRefill(progress, new Date());
            if (next) {
              setProgress(next);
              onClose();
            }
          }}
        />
        {FEATURES.ads && <Button label="Regarder une vidéo (+25 ⚡)" tone="secondary" onPress={onClose} />}
        <Button label="Réviser mes erreurs (gratuit)" tone="secondary" onPress={() => { onClose(); router.push('/session/review'); }} />
        <Button label="Réviser le deck (gratuit)" tone="secondary" onPress={() => { onClose(); router.push('/deck/review'); }} />
        <Button label="Fermer" tone="ghost" onPress={onClose} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ actions: { gap: space.sm } });
