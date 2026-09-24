import { unitTraits } from '../mastery';
import { CODE_KEYS_V1_1, grandfatherNewExercises, migratePersistedProgress, migrateProgress } from '../migrations';
import { emptyProgress, emptyQuestionProgress, emptyUnitProgress, type Progress } from '../types';
import { makeExercise } from './fixtures';

describe('migrateProgress', () => {
  it('rend un état vide pour n’importe quoi d’autre qu’un objet', () => {
    expect(migrateProgress(null)).toEqual(emptyProgress());
    expect(migrateProgress('x')).toEqual(emptyProgress());
    expect(migrateProgress([1])).toEqual(emptyProgress());
  });

  it('complète une progression v0.1 sans énergie, gemmes, quêtes ni ligue', () => {
    const old = {
      schemaVersion: 1,
      xp: 340,
      questions: { k: { key: 'k', seen: 2, correct: 2, streak: 2, lastAnswerCorrect: true, lastSeenAt: null, inReview: false } },
      units: {},
      cards: {},
      streak: { current: 3, best: 5, lastActiveDay: '2026-09-09', freezes: 1, freezeUsedOn: [] },
      badges: { first_session: '2026-09-01T00:00:00.000Z' },
      counters: { sessionsCompleted: 4, reviewRecovered: 0, sourcesOpened: 0, chronoPerfects: 0, perfectSessions: 1, earlySessions: 0, nightSessions: 0, cardsReviewed: 3 },
      ads: { sessionsSinceLastAd: 4, lastAdAt: null, adsShown: 0 },
    };
    const p = migrateProgress(old);
    expect(p.xp).toBe(340);
    expect(p.streak.current).toBe(3);
    expect(p.counters.sessionsCompleted).toBe(4);
    expect(p.counters.questsCompleted).toBe(0);
    expect(p.questions.k.streak).toBe(2);
    expect(p.gems).toBe(0);
    expect(p.energy).toEqual(emptyProgress().energy);
    expect(p.quests).toEqual(emptyProgress().quests);
    expect(p.league).toEqual(emptyProgress().league);
    expect(p.boost).toEqual(emptyProgress().boost);
  });

  it('ignore une valeur d’un mauvais type et les clés inconnues', () => {
    const p = migrateProgress({ xp: 'beaucoup', gems: 12, foo: 1, streak: 'nope' });
    expect(p.xp).toBe(0);
    expect(p.gems).toBe(12);
    expect(p.streak).toEqual(emptyProgress().streak);
    expect('foo' in p).toBe(false);
  });

  it('est idempotente sur un état déjà à jour', () => {
    const current = emptyProgress();
    current.gems = 50;
    expect(migrateProgress(current)).toEqual(current);
  });
});

describe('v3 : exercices « lis le code » ajoutés en 1.1', () => {
  // py-1 en 1.0 : 4 exercices ; la 1.1 en ajoute 2.
  const oldKeys = ['py-1:def:a', 'py-1:def:b', 'py-1:term:a', 'py-1:x:1'];
  const added = { 'py-1': ['py-1:w:1', 'py-1:w:2'] };
  const exercises = [...oldKeys, ...added['py-1']].map((key) => makeExercise(key, 'py-1'));

  function v10(streak: number, latched = true): Progress {
    let p = emptyProgress();
    p = {
      ...p,
      units: { 'py-1': { ...emptyUnitProgress('py-1'), firstTraitEarned: latched } },
      questions: Object.fromEntries(
        oldKeys.map((key, i) => [
          key,
          { ...emptyQuestionProgress(key), seen: 5, correct: 5, streak, lastAnswerCorrect: true, lastSeenAt: `2026-0${i + 1}-15T10:00:00.000Z` },
        ]),
      ),
    };
    return p;
  }

  it('garde les couronnes d’une unité terminée en 1.0', () => {
    for (const streak of [1, 2, 3, 4, 5]) {
      const before = v10(streak);
      const crownsIn10 = unitTraits(before, 'py-1', exercises.slice(0, 4));
      // Sans migration, le contenu 1.1 fait retomber l'unité à 1 couronne.
      expect(unitTraits(before, 'py-1', exercises)).toBe(1);
      const after = grandfatherNewExercises(before, added);
      expect(unitTraits(after, 'py-1', exercises)).toBe(crownsIn10);
      expect(after.questions['py-1:w:1']).toEqual({
        key: 'py-1:w:1', seen: 1, correct: 1, streak, lastAnswerCorrect: true, lastSeenAt: '2026-04-15T10:00:00.000Z', inReview: false,
      });
    }
  });

  it('prend le streak le plus bas des anciens exercices', () => {
    const p = v10(4);
    p.questions['py-1:def:b'] = { ...p.questions['py-1:def:b'], streak: 2 };
    const after = grandfatherNewExercises(p, added);
    expect(after.questions['py-1:w:2'].streak).toBe(2);
    expect(unitTraits(after, 'py-1', exercises)).toBe(3);
  });

  it('ne touche pas une vraie réponse de la 1.1 et ne fait jamais baisser une couronne', () => {
    const p = v10(3);
    p.questions['py-1:w:1'] = { ...emptyQuestionProgress('py-1:w:1'), seen: 1, streak: 0, lastAnswerCorrect: false, inReview: true, lastSeenAt: '2026-09-01T10:00:00.000Z' };
    const after = grandfatherNewExercises(p, added);
    expect(after.questions['py-1:w:1']).toBe(p.questions['py-1:w:1']);
    expect(after.questions['py-1:w:2'].streak).toBe(3);
    expect(unitTraits(after, 'py-1', exercises)).toBe(unitTraits(p, 'py-1', exercises));
  });

  it('laisse intactes les unités non acquises, pas commencées, ou sans streak', () => {
    const notLatched = v10(3, false);
    expect(grandfatherNewExercises(notLatched, added)).toBe(notLatched);
    const zero = v10(0);
    expect(grandfatherNewExercises(zero, added)).toBe(zero);
    const empty = { ...emptyProgress(), units: { 'py-1': { ...emptyUnitProgress('py-1'), firstTraitEarned: true } } };
    expect(grandfatherNewExercises(empty, added)).toBe(empty);
    // Clé d'une autre unité au préfixe proche (« py-10: ») : ignorée.
    const other = v10(3);
    const onlyOther = { ...other, questions: { 'py-10:def:a': { ...other.questions['py-1:def:a'], key: 'py-10:def:a' } } };
    expect(grandfatherNewExercises(onlyOther, added)).toBe(onlyOther);
  });

  it('ignore des entrées illisibles', () => {
    const p = v10(3);
    const broken = { ...p, questions: { ...p.questions, 'py-1:bad': null, 'py-1:nan': { key: 'py-1:nan', streak: 'x' } } } as unknown as Progress;
    const after = grandfatherNewExercises(broken, added);
    expect(after.questions['py-1:w:1'].streak).toBe(3);
    const noDate = v10(2);
    for (const key of oldKeys) noDate.questions[key] = { ...noDate.questions[key], lastSeenAt: null };
    expect(grandfatherNewExercises(noDate, added).questions['py-1:w:1'].lastSeenAt).toBeNull();
  });

  it('est idempotente', () => {
    const once = grandfatherNewExercises(v10(3), added);
    expect(grandfatherNewExercises(once, added)).toBe(once);
  });

  it('la liste figée compte les 529 exercices des 45 unités, tous préfixés par leur unité', () => {
    const units = Object.keys(CODE_KEYS_V1_1);
    expect(units).toHaveLength(45);
    const keys = units.flatMap((u) => CODE_KEYS_V1_1[u].map((k) => [u, k] as const));
    expect(keys).toHaveLength(529);
    expect(new Set(keys.map(([, k]) => k)).size).toBe(529);
    for (const [u, k] of keys) expect(k.startsWith(`${u}:`)).toBe(true);
  });

  it('migratePersistedProgress ne l’applique qu’en venant d’une version antérieure à 3', () => {
    const raw = {
      ...v10(3),
      units: { 'py-1': { ...emptyUnitProgress('py-1'), firstTraitEarned: true } },
      questions: { 'py-1:def:a': { ...emptyQuestionProgress('py-1:def:a'), seen: 1, streak: 3 } },
    };
    const from2 = migratePersistedProgress(raw, 2);
    expect(from2.questions['py-1:w:1']?.streak).toBe(3);
    expect(from2.questions['py-1:w:10']?.streak).toBe(3);
    const from0 = migratePersistedProgress(raw, 0);
    expect(from0.questions['py-1:w:1']?.streak).toBe(3);
    const from3 = migratePersistedProgress(raw, 3);
    expect(from3.questions['py-1:w:1']).toBeUndefined();
    expect(migratePersistedProgress(undefined, 2)).toEqual(emptyProgress());
  });
});
