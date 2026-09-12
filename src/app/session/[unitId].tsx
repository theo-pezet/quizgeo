import { useLocalSearchParams } from 'expo-router';

import { UNIT_BY_ID } from '@/content';
import { SessionScreen } from '@/features/session/SessionScreen';

export default function UnitSessionRoute() {
  const { unitId, skip } = useLocalSearchParams<{ unitId: string; skip?: string }>();
  const unit = UNIT_BY_ID.get(unitId ?? '');
  const skipTest = skip === '1';
  return (
    <SessionScreen
      spec={{ mode: 'unit', unitId: unitId ?? '', skipTest }}
      title={skipTest ? `Test de sortie · ${unit?.title ?? ''}` : (unit?.title ?? 'Session')}
    />
  );
}
