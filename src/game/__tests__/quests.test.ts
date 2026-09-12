import {
  QUESTS_PER_DAY,
  QUEST_TEMPLATES,
  applyQuestEvent,
  ensureQuests,
  questLabel,
  questsForDay,
  questsReward,
} from '../quests';
import type { Quest, QuestKind, QuestState } from '../types';

const DAY = '2026-09-09';

describe('questsForDay', () => {
  it('tire 3 quêtes de genres distincts, de façon reproductible', () => {
    const a = questsForDay(DAY);
    const b = questsForDay(DAY);
    expect(a).toEqual(b);
    expect(a).toHaveLength(QUESTS_PER_DAY);
    expect(new Set(a.map((q) => q.kind)).size).toBe(QUESTS_PER_DAY);
    for (const q of a) {
      const template = QUEST_TEMPLATES.find((t) => t.kind === q.kind);
      expect(template?.tiers.some(([target, reward]) => target === q.target && reward === q.reward)).toBe(true);
      expect(q).toMatchObject({ progress: 0, done: false, id: `${DAY}:${q.kind}` });
    }
  });

  it('change d’un jour à l’autre', () => {
    const days = ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
    const signatures = new Set(days.map((d) => questsForDay(d).map((q) => `${q.kind}:${q.target}`).join('|')));
    expect(signatures.size).toBeGreaterThan(1);
  });
});

describe('ensureQuests', () => {
  it('régénère quand le jour change et laisse le même jour intact', () => {
    const fresh = ensureQuests({ day: null, items: [] }, DAY);
    expect(fresh.day).toBe(DAY);
    expect(fresh.items).toHaveLength(3);
    const touched: QuestState = { ...fresh, items: fresh.items.map((q) => ({ ...q, progress: 1 })) };
    expect(ensureQuests(touched, DAY)).toBe(touched);
    expect(ensureQuests(touched, '2026-09-10').items.every((q) => q.progress === 0)).toBe(true);
  });
});

describe('applyQuestEvent', () => {
  const quest = (kind: QuestKind, target: number): Quest => ({ id: kind, kind, target, progress: 0, reward: 20, done: false });
  const all: QuestState = {
    day: DAY,
    items: [quest('xp', 50), quest('lessons', 2), quest('perfect', 1), quest('combo', 5), quest('cards', 10), quest('recover', 3)],
  };
  const find = (s: QuestState, kind: QuestKind) => s.items.find((q) => q.kind === kind) as Quest;

  it('cumule les XP et signale l’accomplissement une seule fois', () => {
    const r1 = applyQuestEvent(all, { kind: 'xp', amount: 30 });
    expect(find(r1.state, 'xp')).toMatchObject({ progress: 30, done: false });
    expect(r1.completed).toEqual([]);
    const r2 = applyQuestEvent(r1.state, { kind: 'xp', amount: 30 });
    expect(find(r2.state, 'xp')).toMatchObject({ progress: 50, done: true });
    expect(r2.completed.map((q) => q.kind)).toEqual(['xp']);
    const r3 = applyQuestEvent(r2.state, { kind: 'xp', amount: 30 });
    expect(r3.completed).toEqual([]);
    expect(find(r3.state, 'xp').progress).toBe(50);
  });

  it('compte les leçons, et les sans-faute seulement quand c’en est un', () => {
    const r = applyQuestEvent(all, { kind: 'lesson', perfect: false });
    expect(find(r.state, 'lessons').progress).toBe(1);
    expect(find(r.state, 'perfect').progress).toBe(0);
    const p = applyQuestEvent(r.state, { kind: 'lesson', perfect: true });
    expect(find(p.state, 'lessons')).toMatchObject({ progress: 2, done: true });
    expect(find(p.state, 'perfect')).toMatchObject({ progress: 1, done: true });
    expect(p.completed.map((q) => q.kind)).toEqual(['lessons', 'perfect']);
  });

  it('garde le meilleur combo, et compte cartes et récupérations', () => {
    let s = applyQuestEvent(all, { kind: 'combo', best: 3 }).state;
    s = applyQuestEvent(s, { kind: 'combo', best: 2 }).state;
    expect(find(s, 'combo').progress).toBe(3);
    s = applyQuestEvent(s, { kind: 'cards', count: 4 }).state;
    s = applyQuestEvent(s, { kind: 'recover', count: 2 }).state;
    expect(find(s, 'cards').progress).toBe(4);
    expect(find(s, 'recover').progress).toBe(2);
  });

  it('ne touche pas aux quêtes étrangères à l’événement', () => {
    const r = applyQuestEvent(all, { kind: 'cards', count: 1 });
    expect(find(r.state, 'xp')).toBe(find(all, 'xp'));
  });

  it('questsReward additionne les récompenses', () => {
    expect(questsReward([quest('xp', 1), quest('cards', 1)])).toBe(40);
    expect(questsReward([])).toBe(0);
  });
});

describe('questLabel', () => {
  it('a un libellé pour chaque genre', () => {
    const kinds: QuestKind[] = ['xp', 'lessons', 'perfect', 'combo', 'cards', 'recover'];
    for (const kind of kinds) {
      expect(questLabel({ id: kind, kind, target: 3, progress: 0, reward: 1, done: false }).length).toBeGreaterThan(5);
    }
  });
});
