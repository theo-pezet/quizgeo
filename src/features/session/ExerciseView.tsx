import type { Exercise } from '@/game';

import { CaseView } from './CaseView';
import { ClozeView } from './ClozeView';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { QcmView } from './QcmView';
import { TypeView } from './TypeView';

interface Props {
  exercise: Exercise;
  onAnswer: (correct: boolean) => void;
  locked: boolean;
  /** Mode maîtrise (unité à 3 couronnes ou plus) : les QCM typables se tapent. */
  hard?: boolean;
}

export function ExerciseView({ exercise, onAnswer, locked, hard = false }: Props) {
  switch (exercise.kind) {
    case 'qcm':
      if (hard && exercise.typed) {
        return <TypeView exercise={{ ...exercise, typed: exercise.typed }} onAnswer={onAnswer} locked={locked} />;
      }
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
