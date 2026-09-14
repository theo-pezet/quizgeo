import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FEATURES } from '@/config/features';
import { SHOP, applyBuyRefill, currentEnergy, minutesToLesson } from '@/game';
import { useT } from '@/i18n';
import { useProgress } from '@/store/progress';

import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { space, useColors } from './tokens';

/**
 * Plus d'énergie : attendre, recharger, ou réviser gratuitement. Une pub
 * récompensée s'ajoutera ici quand le SDK existera (FEATURES.ads).
 */
export function NoEnergySheet({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const setProgress = useProgress((s) => s.setProgress);
  const now = new Date();
  const value = currentEnergy(progress.energy, now);
  const wait = minutesToLesson(progress.energy, now);
  const canPay = progress.gems >= SHOP.refill.cost;
  const waitText = wait >= 60 ? `${t('common.hours', { count: Math.floor(wait / 60) })} ${t('common.min', { count: wait % 60 })}` : t('common.min', { count: wait });

  return (
    <Card color={colors.danger}>
      <View style={styles.head}>
        <Icon name="flash" size={24} color={colors.energy} />
        <Text variant="h2">{t('energy.empty.title')}</Text>
      </View>
      <Text variant="small" secondary>
        {t('energy.empty.body', { count: value, wait: waitText })}
      </Text>
      <View style={styles.actions}>
        <Button
          label={`${t('energy.refill', { cost: SHOP.refill.cost })}${canPay ? '' : ` · ${t('energy.missing', { count: SHOP.refill.cost - progress.gems })}`}`}
          disabled={!canPay}
          onPress={() => {
            const next = applyBuyRefill(progress, new Date());
            if (next) {
              setProgress(next);
              onClose();
            }
          }}
        />
        {FEATURES.ads && <Button label={t('energy.watchAd')} tone="secondary" onPress={onClose} />}
        <Button label={t('energy.reviewErrors')} tone="secondary" onPress={() => { onClose(); router.push('/session/review'); }} />
        <Button label={t('energy.reviewDeck')} tone="secondary" onPress={() => { onClose(); router.push('/deck/review'); }} />
        <Button label={t('common.close')} tone="ghost" onPress={onClose} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ actions: { gap: space.sm }, head: { flexDirection: 'row', alignItems: 'center', gap: space.sm } });
