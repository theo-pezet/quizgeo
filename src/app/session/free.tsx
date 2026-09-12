import { useLocalSearchParams } from 'expo-router';

import { SUBJECT_BY_ID } from '@/content';
import { SessionScreen } from '@/features/session/SessionScreen';

export default function FreeSessionRoute() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const subject = SUBJECT_BY_ID.get(subjectId ?? '');
  return <SessionScreen spec={{ mode: 'free', subjectId: subjectId ?? '' }} title={`Entraînement libre · ${subject?.title ?? ''}`} />;
}
