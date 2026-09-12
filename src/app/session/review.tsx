import { SessionScreen } from '@/features/session/SessionScreen';

export default function ReviewSessionRoute() {
  return <SessionScreen spec={{ mode: 'review' }} title="Révision de mes erreurs" />;
}
