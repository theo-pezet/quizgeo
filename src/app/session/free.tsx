import { useLocalSearchParams } from 'expo-router';

import { useContent } from '@/content/useContent';
import { SessionScreen } from '@/features/session/SessionScreen';
import { useT } from '@/i18n';

export default function FreeSessionRoute() {
  const t = useT();
  const { SUBJECT_BY_ID } = useContent();
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const subject = SUBJECT_BY_ID.get(subjectId ?? '');
  return <SessionScreen spec={{ mode: 'free', subjectId: subjectId ?? '' }} title={t('session.title.free', { subject: subject?.title ?? '' })} />;
}
