/**
 * La machine à états d'une session, sur le vrai contenu : une file vide ne
 * coûte rien, le rattrapage repose une erreur au plus RELEARN_MAX fois, le
 * prétest est sans conséquence, et la barre de progression ne recule jamais.
 */
import { act, create } from 'react-test-renderer';

import { content } from '@/content/useContent';
import { PRETEST_SIZE, RELEARN_MAX, currentEnergy } from '@/game';
import { useProgress } from '@/store/progress';

import { useSession, type SessionSpec } from '../useSession';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn(), selectionAsync: jest.fn() }), { virtual: true });
jest.mock('expo-audio', () => ({ createAudioPlayer: () => ({ play: jest.fn(), seekTo: jest.fn() }), setAudioModeAsync: jest.fn() }), { virtual: true });
jest.mock('expo-notifications', () => ({}), { virtual: true });

type Api = ReturnType<typeof useSession>;

function mount(spec: SessionSpec): { get: () => Api } {
  let api!: Api;
  function Probe() {
    api = useSession(spec);
    return null;
  }
  act(() => {
    create(<Probe />);
  });
  return { get: () => api };
}

/** Passe les fiches « New » (première leçon d'une unité) jusqu'à la prochaine question. */
function skipLearn(s: { get: () => Api }) {
  let guard = 0;
  while (s.get().current?.learn !== undefined && guard < 20) {
    guard += 1;
    act(() => {
      s.get().next();
    });
  }
}

beforeEach(() => {
  act(() => {
    useProgress.getState().reset();
  });
});

describe('useSession', () => {
  it('file vide : écran « rien à réviser », sans prélever d’énergie', () => {
    const before = currentEnergy(useProgress.getState().progress.energy, new Date());
    const s = mount({ mode: 'unit', unitId: 'unite-inconnue' });
    expect(s.get().state.phase).toBe('empty');
    expect(currentEnergy(useProgress.getState().progress.energy, new Date())).toBe(before);

    const r = mount({ mode: 'review' });
    expect(r.get().state.phase).toBe('empty');
  });

  it('tout rater : chaque exercice revient, au plus RELEARN_MAX fois, la barre ne recule pas', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    expect(s.get().state.phase).toBe('question');
    const mainKeys = new Set(s.get().state.steps.flatMap((step) => (step.exercise ? [step.exercise.key] : [])));
    // Première leçon : des fiches « New » s'intercalent entre les questions.
    expect(s.get().state.steps.some((step) => step.learn !== undefined)).toBe(true);
    let lastRatio = 0;
    let guard = 0;
    while (s.get().state.phase !== 'done' && guard < 100) {
      guard += 1;
      act(() => {
        s.get().answer(false);
      });
      expect(s.get().ratio).toBeGreaterThanOrEqual(lastRatio);
      lastRatio = s.get().ratio;
      act(() => {
        s.get().next();
      });
      if (s.get().state.phase !== 'done') {
        expect(s.get().ratio).toBeGreaterThanOrEqual(lastRatio);
        lastRatio = s.get().ratio;
      }
    }
    const retries = s.get().state.steps.filter((step) => step.retry).flatMap((step) => (step.exercise ? [step.exercise.key] : []));
    for (const key of new Set(retries)) expect(retries.filter((k) => k === key).length).toBeLessThanOrEqual(RELEARN_MAX);
    expect(new Set(retries)).toEqual(mainKeys);
    expect(lastRatio).toBe(1);
  });

  it('prétest : une unité jamais commencée s’ouvre sur deux questions sans conséquence', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    const state = s.get().state;
    expect(state.pretestCount).toBe(PRETEST_SIZE);
    expect(state.steps.slice(0, PRETEST_SIZE).every((step) => step.pretest === true)).toBe(true);
    expect(s.get().inPretest).toBe(true);
    const key = s.get().current?.exercise?.key as string;
    act(() => {
      s.get().answer(false);
    });
    expect(s.get().state.feedback?.pretest).toBe(true);
    expect(useProgress.getState().progress.questions[key]).toBeUndefined();
    expect(s.get().ratio).toBe(0);
  });

  it('une erreur « sûre » est signalée et marquée pour la révision', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    for (let i = 0; i < s.get().state.pretestCount; i += 1) {
      act(() => {
        s.get().answer(true);
      });
      act(() => {
        s.get().next();
      });
    }
    skipLearn(s);
    const key = s.get().current?.exercise?.key as string;
    act(() => {
      s.get().answer(false, undefined, true);
    });
    expect(s.get().state.feedback?.confidentMiss).toBe(true);
    expect(useProgress.getState().progress.questions[key].confidentMiss).toBe(true);
  });

  it('« I’m sure » : proposé sur une question neuve, jamais sur une question ratée dans la séance', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    // Prétest : pas de « sûr ».
    expect(s.get().canBeSure).toBe(false);
    for (let i = 0; i < s.get().state.pretestCount; i += 1) {
      act(() => {
        s.get().answer(true);
      });
      act(() => {
        s.get().next();
      });
    }
    skipLearn(s);
    expect(s.get().canBeSure).toBe(true);
    const missed = s.get().current?.exercise?.key as string;
    act(() => {
      s.get().answer(false);
    });
    // On va jusqu'au rattrapage de cette question, en répondant juste au reste.
    let guard = 0;
    while (guard < 40) {
      guard += 1;
      act(() => {
        s.get().next();
      });
      const cur = s.get().current;
      if (s.get().state.phase !== 'question' || !cur) break;
      if (cur.exercise?.key === missed) {
        expect(s.get().canBeSure).toBe(false);
        // Même « sûr », la bonne réponse ne compte pas double.
        act(() => {
          s.get().answer(true, undefined, true);
        });
        expect(useProgress.getState().progress.questions[missed].streak).toBe(1);
        return;
      }
      act(() => {
        s.get().answer(true);
      });
    }
    throw new Error('la question ratée n’est pas revenue');
  });
});

describe('fiches « New » et auto-explication', () => {
  it('une fiche ne se « répond » pas, ne fait pas avancer la barre et passe avec next()', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    for (let i = 0; i < s.get().state.pretestCount; i += 1) {
      act(() => {
        s.get().answer(true);
      });
      act(() => {
        s.get().next();
      });
    }
    expect(s.get().current?.learn).toBeDefined();
    const ratio = s.get().ratio;
    act(() => {
      s.get().answer(true);
    });
    expect(s.get().state.phase).toBe('question');
    act(() => {
      s.get().next();
    });
    expect(s.get().ratio).toBe(ratio);
    expect(s.get().counter.total).toBe(s.get().state.mainCount);
  });
});
