/**
 * Le store persisté : hydratation, migration v3 sur le vrai contenu,
 * robustesse face à un stockage abîmé, réinitialisation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATALOG, contentFor } from '@/content';
import { CODE_KEYS_V1_1, allUnitTraits, currentUnit, emptyProgress, emptyQuestionProgress, emptyUnitProgress, type Progress } from '@/game';
import { useProgress, useSettings } from '@/store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const { EXERCISES } = contentFor('fr');
const NEW_KEYS = new Set(Object.values(CODE_KEYS_V1_1).flat());
/** Unités de code qui existaient en 1.0 (py-audit-1 et py-ia-1 n'ont que des exercices 1.1). */
const CODE_UNITS = Object.keys(CODE_KEYS_V1_1).filter((u) => EXERCISES.some((e) => e.unitId === u && !NEW_KEYS.has(e.key)));
const SEEN_AT = '2026-09-01T10:00:00.000Z';

/** Une progression 1.0 : les unités de code terminées à 4 couronnes (streak 3), sans les exercices de la 1.1. */
function progressV10(): Progress {
  const p = emptyProgress();
  for (const unitId of CODE_UNITS) {
    p.units[unitId] = { ...emptyUnitProgress(unitId), firstTraitEarned: true, sessionsPlayed: 3 };
    for (const e of EXERCISES) {
      if (e.unitId !== unitId || NEW_KEYS.has(e.key)) continue;
      p.questions[e.key] = { ...emptyQuestionProgress(e.key), seen: 4, correct: 4, streak: 3, lastAnswerCorrect: true, lastSeenAt: SEEN_AT };
    }
  }
  return p;
}

async function hydrateFrom(value: string | null): Promise<void> {
  // Remise à zéro AVANT d'écrire : toute écriture du store est persistée.
  useProgress.setState({ progress: emptyProgress(), hydrated: false });
  await AsyncStorage.clear();
  if (value !== null) await AsyncStorage.setItem('progress.v1', value);
  await useProgress.persist.rehydrate();
}

describe('migration v3 sur le vrai contenu', () => {
  it('une progression 1.0 garde ses couronnes sur les 43 unités de code de la 1.0', async () => {
    const before = progressV10();
    // Sans migration, le contenu 1.1 ramène ces unités à 1 couronne.
    expect(CODE_UNITS).toHaveLength(43);
    const broken = allUnitTraits(before, EXERCISES, CATALOG);
    expect(CODE_UNITS.every((u) => broken[u] === 1)).toBe(true);

    await hydrateFrom(JSON.stringify({ state: { progress: before }, version: 2 }));
    const { progress, hydrated } = useProgress.getState();
    expect(hydrated).toBe(true);
    const traits = allUnitTraits(progress, EXERCISES, CATALOG, '2026-09-10');
    expect(CODE_UNITS.filter((u) => traits[u] !== 4)).toEqual([]);
    expect(currentUnit('python', traits, CATALOG)).not.toBe('py-1');
    // La version stockée est passée à 3 : la migration ne se rejouera pas.
    const stored = JSON.parse((await AsyncStorage.getItem('progress.v1')) as string);
    expect(stored.version).toBe(3);
  });

  it('ne change rien de ce qu’un joueur de la 1.1 a vraiment répondu', async () => {
    const p = progressV10();
    const [firstNew] = CODE_KEYS_V1_1['py-1'];
    p.questions[firstNew] = { ...emptyQuestionProgress(firstNew), seen: 1, streak: 0, lastAnswerCorrect: false, inReview: true, lastSeenAt: SEEN_AT };
    await hydrateFrom(JSON.stringify({ state: { progress: p }, version: 2 }));
    const { progress } = useProgress.getState();
    expect(progress.questions[firstNew]).toEqual(p.questions[firstNew]);
    for (const key of Object.keys(p.questions)) expect(progress.questions[key].streak).toBeGreaterThanOrEqual(p.questions[key].streak);
  });

  it('ne rejoue pas la migration sur un état déjà en version 3', async () => {
    const p = progressV10();
    await hydrateFrom(JSON.stringify({ state: { progress: p }, version: 3 }));
    expect(Object.keys(useProgress.getState().progress.questions).some((k) => NEW_KEYS.has(k))).toBe(false);
  });
});

describe('hydratation robuste', () => {
  it('complète un champ manquant même sans changement de version', async () => {
    const p = emptyProgress() as Partial<Progress>;
    delete p.monthly;
    const daily = { ...emptyProgress().daily } as Partial<Progress['daily']>;
    delete daily.deckRewardedOn;
    await hydrateFrom(JSON.stringify({ state: { progress: { ...p, daily, xp: 120 } }, version: 3 }));
    const { progress, hydrated } = useProgress.getState();
    expect(hydrated).toBe(true);
    expect(progress.xp).toBe(120);
    expect(progress.monthly.medals).toEqual([]);
    expect(progress.daily.deckRewardedOn).toBeNull();
  });

  it('démarre même sur un stockage illisible', async () => {
    await hydrateFrom('{pas du json');
    expect(useProgress.getState().hydrated).toBe(true);
  });

  it('démarre sur un premier lancement (rien de stocké)', async () => {
    await hydrateFrom(null);
    expect(useProgress.getState().hydrated).toBe(true);
    expect(useProgress.getState().progress.xp).toBe(0);
  });

  it('les réglages passent aussi à hydratés, même illisibles', async () => {
    useSettings.setState({ hydrated: false });
    await AsyncStorage.setItem('settings.v1', '{pas du json');
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().hydrated).toBe(true);
  });
});

describe('réinitialiser', () => {
  it('garde l’objectif du jour et efface les tests de niveau', () => {
    useProgress.setState({ progress: { ...emptyProgress(), xp: 500, daily: { ...emptyProgress().daily, goal: 100 } } });
    useSettings.getState().setPlacement('python', { score: 8, total: 10, self: 7, skip: 5, at: SEEN_AT });
    useProgress.getState().reset();
    expect(useProgress.getState().progress.xp).toBe(0);
    expect(useProgress.getState().progress.daily.goal).toBe(100);
    expect(useSettings.getState().placements).toEqual({});
  });
});
