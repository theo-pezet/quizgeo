import type { Exercise } from '@/game';

import { CaseView } from './CaseView';
import { ClozeView } from './ClozeView';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { QcmView } from './QcmView';

interface Props {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
}

export function ExerciseView({ exercise, onAnswer, locked }: Props) {
  switch (exercise.kind) {
    case 'qcm':
      return <QcmView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'cloze':
      return <ClozeView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'match':
      return <MatchView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'order':
      return <OrderView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'case':
      return <CaseView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
  }
}
