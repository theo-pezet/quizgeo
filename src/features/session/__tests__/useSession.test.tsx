/**
 * La machine à états d'une session, sur le vrai contenu : une file vide ne
 * coûte rien, le rattrapage ne repose pas deux fois le même exercice, et la
 * barre de progression ne recule jamais.
 */
import { act, create } from 'react-test-renderer';

import { content } from '@/content/useContent';
import { currentEnergy } from '@/game';
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

  it('tout rater : chaque exercice revient une seule fois, la barre ne recule pas', () => {
    const unitId = content().UNITS[0].id;
    const s = mount({ mode: 'unit', unitId });
    expect(s.get().state.phase).toBe('question');
    const mainKeys = new Set(s.get().state.steps.map((step) => step.exercise.key));
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
    const retries = s.get().state.steps.filter((step) => step.retry).map((step) => step.exercise.key);
    expect(new Set(retries).size).toBe(retries.length);
    expect(new Set(retries)).toEqual(mainKeys);
    expect(lastRatio).toBe(1);
  });
});
