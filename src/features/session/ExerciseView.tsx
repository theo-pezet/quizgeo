import type { Exercise } from '@/game';

import { BugLineView } from './BugLineView';
import { CaseView } from './CaseView';
import { ComposeView } from './ComposeView';
import { ClozeView } from './ClozeView';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';
import { QcmView } from './QcmView';

interface Props {
  exercise: Exercise;
  /**
   * `whyWrong` : l'explication propre au mauvais choix, quand l'exercice en a.
   * `given` : la réponse donnée, en texte (pour « Ask Claude »), quand l'exercice sait la dire.
   */
  onAnswer: (correct: boolean, whyWrong?: string, given?: string) => void;
  locked: boolean;
  /**
   * Unité déjà acquise : un temps de réflexion avant les choix. Depuis la 1.7,
   * on ne tape plus la réponse : une saisie stricte comptait faux des réponses
   * justes mal orthographiées, ce qui mesure la frappe et pas le savoir.
   */
  hard?: boolean;
  /** Les choix des QCM attendent le temps de lecture de la question (leçons et révisions). */
  readDelay?: boolean;
}

export function ExerciseView({ exercise, onAnswer, locked, hard = false, readDelay = false }: Props) {
  switch (exercise.kind) {
    case 'qcm':
      return <QcmView exercise={exercise} onAnswer={onAnswer} locked={locked} readDelay={readDelay} think={hard && readDelay} />;
    case 'cloze':
      return <ClozeView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'match':
      return <MatchView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'order':
      return <OrderView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'case':
      return <CaseView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'bugline':
      return <BugLineView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
    case 'compose':
      return <ComposeView exercise={exercise} onAnswer={onAnswer} locked={locked} />;
  }
}
