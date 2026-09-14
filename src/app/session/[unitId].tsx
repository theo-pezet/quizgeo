import { useLocalSearchParams } from 'expo-router';

import { useContent } from '@/content/useContent';
import { SessionScreen } from '@/features/session/SessionScreen';
import { useT } from '@/i18n';

export default function UnitSessionRoute() {
  const t = useT();
  const { UNIT_BY_ID } = useContent();
  const { unitId, skip } = useLocalSearchParams<{ unitId: string; skip?: string }>();
  const unit = UNIT_BY_ID.get(unitId ?? '');
  const skipTest = skip === '1';
  const title = unit?.title ?? t('session.title.default');
  return <SessionScreen spec={{ mode: 'unit', unitId: unitId ?? '', skipTest }} title={skipTest ? t('session.title.skip', { unit: title }) : title} />;
}
