import { useLocalSearchParams } from 'expo-router';

import { UNIT_BY_ID } from '@/content';
import { SessionScreen } from '@/features/session/SessionScreen';

export default function UnitSessionRoute() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const unit = UNIT_BY_ID.get(unitId ?? '');
  return <SessionScreen spec={{ mode: 'unit', unitId: unitId ?? '' }} title={unit?.title ?? 'Session'} />;
}
