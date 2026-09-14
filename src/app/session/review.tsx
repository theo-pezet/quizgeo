import { SessionScreen } from '@/features/session/SessionScreen';
import { useT } from '@/i18n';

export default function ReviewSessionRoute() {
  const t = useT();
  return <SessionScreen spec={{ mode: 'review' }} title={t('session.title.review')} />;
}
